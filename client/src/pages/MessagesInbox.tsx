import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMessages, useSentMessages, useUnreadCount, useCreateMessage,
  useUpdateMessageStatus, useUsers, useAssignments,
} from "@/hooks/use-resources";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Send, Inbox, CheckCircle2, Clock, AlertCircle,
  Plus, ArrowRight, Calendar, User,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Message } from "@shared/schema";

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-200",
  normal: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

const statusColors: Record<string, string> = {
  unread: "bg-blue-100 text-blue-800",
  read: "bg-gray-100 text-gray-700",
  accepted: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  unread: "Unread",
  read: "Read",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  declined: "Declined",
};

export default function MessagesInbox() {
  const { user } = useAuth();
  const { data: inboxMessages, isLoading: loadingInbox } = useMessages();
  const { data: sentMessages, isLoading: loadingSent } = useSentMessages();
  const { data: users } = useUsers();
  const { data: assignments } = useAssignments();
  const { mutate: createMessage, isPending: isSending } = useCreateMessage();
  const { mutate: updateStatus } = useUpdateMessageStatus();

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeForm, setComposeForm] = useState({
    recipientId: "",
    type: "message" as "message" | "task",
    subject: "",
    body: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    dueDate: "",
    relatedPatientId: "",
  });

  const queryClient = useQueryClient();

  const markAsRead = useCallback(async (msgId: number) => {
    const url = buildUrl(api.messages.update.path, { id: msgId });
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "read" }),
    });
    queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    queryClient.invalidateQueries({ queryKey: [api.messages.unread.path] });
  }, [queryClient]);

  if (!user) return null;

  const getUserName = (id: number) => {
    const u = (users || []).find((u: any) => u.id === id);
    return u?.name || `User #${id}`;
  };

  // Filter recipients based on role permissions
  const allUsers = (users || []) as any[];
  const allAssignments = (assignments || []) as any[];

  const getRecipients = () => {
    if (allUsers.length === 0) return [];
    if (user.role === "admin" || user.role === "cdpo" || user.role === "dwcweo" || user.role === "higher_official") {
      return allUsers.filter((u: any) => u.id !== user.id);
    }
    if (user.role === "supervisor") {
      const fwIds = allAssignments
        .filter((a: any) => a.supervisorId === user.id)
        .map((a: any) => a.fieldWorkerId);
      return allUsers.filter((u: any) => fwIds.includes(u.id));
    }
    if (user.role === "field_worker") {
      const myAssignment = allAssignments.find((a: any) => a.fieldWorkerId === user.id);
      if (myAssignment) {
        return allUsers.filter((u: any) => u.id === myAssignment.supervisorId);
      }
      return [];
    }
    return [];
  };

  const recipients = getRecipients();

  const handleSend = () => {
    if (!composeForm.recipientId || !composeForm.subject) return;
    createMessage(
      {
        recipientId: Number(composeForm.recipientId),
        type: composeForm.type,
        subject: composeForm.subject,
        body: composeForm.body || undefined,
        priority: composeForm.priority,
        dueDate: composeForm.dueDate || undefined,
        relatedPatientId: composeForm.relatedPatientId ? Number(composeForm.relatedPatientId) : undefined,
      },
      {
        onSuccess: () => {
          setIsComposeOpen(false);
          setComposeForm({ recipientId: "", type: "message", subject: "", body: "", priority: "normal", dueDate: "", relatedPatientId: "" });
        },
      }
    );
  };

  const getNextStatus = (msg: Message): string | null => {
    if (msg.type === "task") {
      switch (msg.status) {
        case "unread":
        case "read": return "accepted";
        case "accepted": return "in_progress";
        case "in_progress": return "completed";
        default: return null;
      }
    }
    return null;
  };

  const getNextStatusLabel = (msg: Message): string | null => {
    const next = getNextStatus(msg);
    if (!next) return null;
    return { accepted: "Accept", in_progress: "Start", completed: "Complete" }[next] || next;
  };

  const inbox = (inboxMessages || []) as Message[];
  const sent = (sentMessages || []) as Message[];
  const tasks = inbox.filter(m => m.type === "task");

  const renderMessageRow = (msg: Message, showSender: boolean) => {
    const isOverdue = msg.type === "task" && msg.dueDate && new Date(msg.dueDate) < new Date() && msg.status !== "completed";
    const isSelected = selectedMessage?.id === msg.id;

    return (
      <div
        key={msg.id}
        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/70" : ""} ${msg.status === "unread" ? "bg-primary/5" : ""}`}
        onClick={() => {
          setSelectedMessage(msg);
          if (msg.status === "unread" && msg.recipientId === user.id) {
            markAsRead(msg.id);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
              {getUserName(showSender ? msg.senderId : msg.recipientId).split(" ").map(n => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {showSender ? getUserName(msg.senderId) : `To: ${getUserName(msg.recipientId)}`}
                </span>
                {msg.type === "task" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Task</Badge>
                )}
              </div>
              <p className={`text-sm truncate ${msg.status === "unread" ? "font-semibold" : ""}`}>
                {msg.subject}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={`text-[10px] ${priorityColors[msg.priority]}`}>
              {msg.priority}
            </Badge>
            <Badge className={`text-[10px] ${statusColors[msg.status]}`}>
              {statusLabels[msg.status]}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Communicate with your team and manage tasks.</p>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>Send a message or assign a task.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <Select value={composeForm.recipientId} onValueChange={(v) => setComposeForm(f => ({ ...f, recipientId: v }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select recipient..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {recipients.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.role.replace("_", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recipients.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {allUsers.length === 0
                      ? "Loading users..."
                      : user.role === "field_worker"
                      ? "No supervisor assigned to you yet. Ask an admin to assign you."
                      : user.role === "supervisor"
                      ? "No field workers assigned to you yet. Ask an admin to create assignments."
                      : "No other users available to message."}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Type</Label>
                  <Select value={composeForm.type} onValueChange={(v: any) => setComposeForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="message">Message</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Priority</Label>
                  <Select value={composeForm.priority} onValueChange={(v: any) => setComposeForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Enter subject..."
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={composeForm.body}
                  onChange={(e) => setComposeForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Enter message..."
                  rows={4}
                />
              </div>
              {composeForm.type === "task" && (
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={composeForm.dueDate}
                    onChange={(e) => setComposeForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button disabled={!composeForm.recipientId || !composeForm.subject || isSending} onClick={handleSend}>
                <Send className="w-4 h-4 mr-2" />
                {isSending ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-2">
          <Card>
            <Tabs defaultValue="inbox">
              <CardHeader className="pb-3">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="inbox" className="gap-2">
                    <Inbox className="w-3.5 h-3.5" />
                    Inbox ({inbox.length})
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="gap-2">
                    <Send className="w-3.5 h-3.5" />
                    Sent ({sent.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tasks ({tasks.length})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-0">
                <TabsContent value="inbox" className="m-0">
                  {loadingInbox ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : inbox.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No messages in your inbox.</p>
                    </div>
                  ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                      {inbox.map(msg => renderMessageRow(msg, true))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="sent" className="m-0">
                  {loadingSent ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : sent.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No sent messages.</p>
                    </div>
                  ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                      {sent.map(msg => renderMessageRow(msg, false))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="tasks" className="m-0">
                  {tasks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No tasks assigned to you.</p>
                    </div>
                  ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                      {tasks.map(msg => renderMessageRow(msg, true))}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedMessage ? "Message Detail" : "Select a message"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMessage ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">{selectedMessage.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] ${priorityColors[selectedMessage.priority]}`}>
                        {selectedMessage.priority}
                      </Badge>
                      <Badge className={`text-[10px] ${statusColors[selectedMessage.status]}`}>
                        {statusLabels[selectedMessage.status]}
                      </Badge>
                      {selectedMessage.type === "task" && (
                        <Badge variant="outline" className="text-[10px]">Task</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span>From: {getUserName(selectedMessage.senderId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>To: {getUserName(selectedMessage.recipientId)}</span>
                    </div>
                    {selectedMessage.createdAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{format(new Date(selectedMessage.createdAt), "PPp")}</span>
                      </div>
                    )}
                    {selectedMessage.dueDate && (
                      <div className={`flex items-center gap-2 ${new Date(selectedMessage.dueDate) < new Date() && selectedMessage.status !== "completed" ? "text-destructive" : "text-muted-foreground"}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due: {format(new Date(selectedMessage.dueDate), "PP")}</span>
                      </div>
                    )}
                  </div>

                  {selectedMessage.body && (
                    <div className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">
                      {selectedMessage.body}
                    </div>
                  )}

                  {/* Task action buttons (only for recipient) */}
                  {selectedMessage.recipientId === user.id && selectedMessage.type === "task" && getNextStatus(selectedMessage) && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => updateStatus({ id: selectedMessage.id, status: getNextStatus(selectedMessage)! })}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {getNextStatusLabel(selectedMessage)}
                      </Button>
                      {selectedMessage.status !== "declined" && selectedMessage.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive"
                          onClick={() => updateStatus({ id: selectedMessage.id, status: "declined" })}
                        >
                          Decline
                        </Button>
                      )}
                    </div>
                  )}

                  {selectedMessage.completedAt && (
                    <p className="text-xs text-green-600">
                      Completed {format(new Date(selectedMessage.completedAt), "PPp")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click on a message to view details.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
