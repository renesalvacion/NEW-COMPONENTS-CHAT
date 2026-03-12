import axios from 'axios';
import { ensureSignalRConnection } from './signalr'
import type { useMessengerStore } from './index';

function getUrl(){
  const runtime = useRuntimeConfig()
  
  const api = runtime.public.chatApi

  return api
}

export async function viewMessages(
  store: ReturnType<typeof useMessengerStore>,
  userId: number,
  partnerId: number
) {
  const apiUrl = getUrl()

  let chat = store.openChats.find(c => c.partnerId === partnerId)

  if (!chat) {
    chat = {
      partnerId,
      messages: [],
      isOpen: true,
      unread: 0,
      page: 1,
      total: 0
    }
    store.openChats.push(chat)
  } else {
    chat.isOpen = true
  }

  chat.unread = 0

  const res = await axios.get(
    `${apiUrl}/api/chat/view-person-message/${userId}/${partnerId}?page=1`,
    { withCredentials: true }
  )

  const grouped = res.data.data?.messages || []
  const totalMessages = res.data.data?.totalMessages || 0

  // 🔥 FLATTEN HERE
  const latestMessages = grouped.flatMap((group: any) =>
    group.messages.map((msg: any) => ({
      ...msg,
      day: group.day
    }))
  )

  const existingIds = new Set(chat.messages.map(m => m.id))

  chat.messages = [
    ...chat.messages,
    ...latestMessages.filter((m: any) => !existingIds.has(m.id))
  ]

  chat.page = 1
  chat.total = totalMessages

  return chat.messages
}

 export async function sendMessage(
  store: ReturnType<typeof useMessengerStore>,
  receiverId: number,
  content: string,
  files: File[]
) {
  const apiUrl = getUrl();

  // ✅ Ensure SignalR connection
  //await ensureSignalRConnection(store, true);

  // ✅ Find or create chat
  const chat =
    store.openChats.find((c) => c.partnerId === receiverId) ||
    { partnerId: receiverId, messages: [], isOpen: true, unread: 0, page: 1, total: 0 };
  if (!store.openChats.includes(chat)) store.openChats.push(chat);

  // --------- 1️⃣ Handle file uploads ---------
  const uploadedAttachments = await Promise.all(
    files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${apiUrl}/api/chat/upload`, formData, { withCredentials: true });

      return {
        filename: res.data.filename,
        filepath: res.data.filepath,
        filetype: file.type,
        fileSize: file.size, // ✅ include file size
      };
    })
  );

  // --------- 2️⃣ Prevent empty message ---------
  if (!content.trim() && uploadedAttachments.length === 0) {
    alert("Cannot send empty message");
    return;
  }

  // --------- 3️⃣ Temp message for immediate UI feedback ---------
  const tempMessage = {
    id: "temp-" + Date.now(),
    senderId: store.getSessionId(),
    content,
    attachments: uploadedAttachments,
    createdAt: new Date().toISOString(),
    isTemp: true,
    isError: false,
  };
  chat.messages.push(tempMessage);
  chat.messages = [...chat.messages];

  // --------- 4️⃣ Send to server (SignalR) ---------
  try {
    const serverMessage: any = await store.connection!.invoke(
      "SendMessage",
      receiverId,
      content,
      uploadedAttachments
    );

    // Replace temp message with server message if successful
    if (serverMessage?.id) {
      const idx = chat.messages.findIndex((m) => m.id === tempMessage.id);
      if (idx !== -1) chat.messages[idx] = serverMessage;
    }
  } catch (err: any) {
    // Handle errors from Hub (rate limit, repeated content, attachment size)
    tempMessage.isError = true;
    tempMessage.errorMessage = err?.message || "Failed to send message";
    console.error("SendMessage error:", err);
  }

  // Trigger reactive update
  chat.messages = [...chat.messages];
}

export async function deleteMessage(messageId: number){
   const apiUrl = getUrl()
    try {
      const response = await axios.post(`${apiUrl}/api/chat/delete-message/${messageId}`,{}, {
        withCredentials : true,
        
      })

      console.log("Delete Response: ", response);
      
      alert("Message: " + response.data.message)
    } catch (error: any) { 
      alert('Error Message: ' + error?.response?.data.message)
    }
  }

export async function reactionMessage(messageId: number, reactionType: number) {
   const apiUrl = getUrl()

  try {
    const token = localStorage.getItem("token");

    const response = await axios.post(
      `${apiUrl}/api/chat/react/${messageId}/${reactionType}`,
      {},
      {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.data.status === 200) {
      console.log("Message: " + response.data.message);
    }
  } catch (error) {
    console.log(error);
  }
}

export async function loadOlderMessages(store:ReturnType<typeof useMessengerStore>,partnerId: number, userId: number) {

  const apiUrl = useRuntimeConfig()
  const url = apiUrl.public.chatApi

  console.log("Stores/chat/message.ts: " + url);
  
  const chat = store.openChats.find(c => c.partnerId === partnerId);
  if (!chat) return;

  // Stop if we've loaded all messages
  if (chat.total && chat.messages.length >= chat.total) return;

  const nextPage = (chat.page || 1) + 1;

  try {
    const res = await axios.get(
      `${url}/api/chat/view-person-message/${userId}/${partnerId}?page=${nextPage}`,
      { withCredentials:true } 
    );

    // With this:
const grouped = res.data.data?.messages || [];
const olderMessages = grouped.flatMap((group: any) =>
  group.messages.map((msg: any) => ({
    ...msg,
    day: group.day
  }))
)
    const totalMessages = res.data.data?.totalMessages || 0;
    if (!olderMessages.length) return;

    // Prevent duplicates
    const existingIds = new Set(chat.messages.map(m => m.id));
    const filtered = olderMessages.filter((m: any) => !existingIds.has(m.id));

    if (filtered.length) {
      // Prepend older messages
      chat.messages = [...filtered, ...chat.messages];
      chat.page = nextPage;
      chat.total = totalMessages;
      chat.isOpen = true;

      console.log(`Loaded ${filtered.length} older messages (page ${nextPage}) for partner ${partnerId}`);
    }
  } catch (err) {
    console.error("Failed to load older messages:", err);
  }
}