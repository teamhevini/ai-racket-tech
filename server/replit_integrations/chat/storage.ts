interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

let nextConvId = 1;
let nextMsgId = 1;
const conversations = new Map<number, Conversation>();
const messages = new Map<number, Message[]>();

export const chatStorage = {
  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(conversations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getConversation(id: number): Promise<Conversation | null> {
    return conversations.get(id) ?? null;
  },

  async createConversation(title: string): Promise<Conversation> {
    const conv: Conversation = { id: nextConvId++, title, createdAt: new Date().toISOString() };
    conversations.set(conv.id, conv);
    messages.set(conv.id, []);
    return conv;
  },

  async deleteConversation(id: number): Promise<void> {
    conversations.delete(id);
    messages.delete(id);
  },

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return messages.get(conversationId) ?? [];
  },

  async createMessage(conversationId: number, role: string, content: string): Promise<Message> {
    const msg: Message = {
      id: nextMsgId++,
      conversationId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    const list = messages.get(conversationId) ?? [];
    list.push(msg);
    messages.set(conversationId, list);
    return msg;
  },
};
