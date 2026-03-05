import crypto from "crypto";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import createMemoryStore from "memorystore";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { type SafeUser } from "@shared/schema";
import { getSessionStore } from "./redis";
import { log } from "./index";
import { logAudit } from "./services/auditLogger";

const isProd = process.env.NODE_ENV === "production";

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min

declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

// Exported for WebSocket upgrade authentication
export let sessionMiddleware: ReturnType<typeof session>;

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && isProd) {
    throw new Error("SESSION_SECRET environment variable is required in production.");
  }
  if (!sessionSecret && !isProd) {
    log("WARNING: SESSION_SECRET not set — using random secret. Sessions will not persist across restarts.", "auth");
  }

  const MemoryStore = createMemoryStore(session);
  const redisStore = getSessionStore();

  if (redisStore) {
    log("Using Redis session store", "auth");
  } else {
    if (isProd) log("WARNING: Using in-memory session store in production — sessions will not persist across restarts", "auth");
    else log("Using in-memory session store", "auth");
  }

  const SESSION_MAX_AGE = 30 * 60 * 1000; // 30 min

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || crypto.randomUUID(),
    resave: false,
    saveUninitialized: false,
    store: redisStore ?? new MemoryStore({ checkPeriod: 86400000 }),
    cookie: {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    },
  };

  sessionMiddleware = session(sessionSettings);
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.validatePassword(username, password);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    const username = req.body?.username || "";

    const attempts = loginAttempts.get(username);
    if (attempts && attempts.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      logAudit({ action: "login_locked", resourceType: "user", resourceId: username, details: { minutesLeft } });
      return res.status(429).json({ message: `Account locked. Try again in ${minutesLeft} minute(s).` });
    }

    passport.authenticate("local", (err: Error | null, user: SafeUser | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) {
        const current = loginAttempts.get(username) || { count: 0, lockedUntil: 0 };
        current.count += 1;
        if (current.count >= MAX_LOGIN_ATTEMPTS) {
          current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
          current.count = 0;
        }
        loginAttempts.set(username, current);
        logAudit({ action: "login_failed", resourceType: "user", resourceId: username, details: { attempt: current.count } });
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      loginAttempts.delete(username);

      req.login(user, (err) => {
        if (err) return next(err);
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          logAudit({ action: "login_success", resourceType: "user", resourceId: String(user.id), details: { username: user.username } });
          res.json(user);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/me", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}
