import { defineStore } from 'pinia';
import type { OpenChat, IncomingCall } from './types';
import { throttle } from 'lodash';
import * as signalR from './signalr';
import { 
  viewMessages as apiViewMessages, 
  sendMessage as apiSendMessage,
  deleteMessage as apiDeleteMessage,
  reactionMessage as apiReactionMessage,
  loadOlderMessages as apiLoadOlderMessages
} from '../messenger/messages';
import { HubConnection } from '@microsoft/signalr';
import * as call from './call';

export const useMessengerStore = defineStore('chat', {
  state: () => ({
    openChats: [] as OpenChat[],
    incomingCall: null as IncomingCall | null,
    connection: null as HubConnection | null,
    peer: null as RTCPeerConnection | null,
    localStream: null as MediaStream | null,
    remoteStream: null as MediaStream | null,
    inCall: false,
    currentCallUserId: null as number | null,
    currentCallId: null as number | null,
    showCallScreen: false,
    showIncomingCallModal: false,
    iceQueue: [] as RTCIceCandidateInit[],
    onlineUsers: new Map<number, boolean>(),
    userLastActive: new Map<number, number>(),
    callStartTime: null as number | null,
    callErrors: [] as string[],
    recientName: '',

      currentCallIsVideo: false, // ✅ add this
        typingUsers: new Set<number>() as Set<number>,
  }),
  
  getters: {
    apiUrl: () => useRuntimeConfig().public.chatApi,
    isUserOnline: (state) => (userId: number) => state.onlineUsers.has(userId),
    isUserActive: (state) => (userId: number) => {
      const last = state.userLastActive.get(userId);
      return last ? (Date.now() - last) < 5 * 60 * 1000 : false;
    }
  },


  actions: {
    getSessionId() { 
      return Number(useAuthStore().user?.userId); 
    },

    // ---------- SIGNALR ----------
    initSignalR() { return signalR.initSignalR(this); },

    // ---------- MESSAGES ----------
    async viewMessagesPerson(userId: number, partnerId: number) { 
      console.log('viewMessages called', userId, partnerId);
      return apiViewMessages(this, userId, partnerId); 
    },
    sendMessage(receiverId: number, content: string, files: File[]) { 
      return apiSendMessage(this, receiverId, content, files); 
    },
    deleteMessage(messageId: number) { 
      return apiDeleteMessage(messageId); 
    },
    reactionMessage(messageId: number, reactionType: number) { 
      return apiReactionMessage(messageId, reactionType); 
    },
    loadOlderMessages(partnerId: number, userId: number) { 
      return apiLoadOlderMessages(this, partnerId, userId); 
    },

    // ---------- CALL ----------
    startCall(partnerId: number, video = false, remoteVideoEl?: HTMLVideoElement | null) { 
      return call.startCall(this, partnerId, video, remoteVideoEl); 
    },
    acceptCall(offerPayload: { type: string; sdp: string; callId?: string }, partnerId: number, remoteVideoEl?: HTMLVideoElement) { 
      return call.acceptCall(this, offerPayload, partnerId, remoteVideoEl); 
    },
    rejectIncomingCall(fromUserId?: number | string) { 
      return call.rejectIncomingCall(this, fromUserId); 
    },
    cleanupCall() { return call.cleanupCall(this); },
    endCall() { return call.endCall(this); },
    getCallDurationInSeconds(): number {
      if (!this.callStartTime) return 0;
      return Math.floor((Date.now() - this.callStartTime) / 1000);
    },
    closeChat(partnerId: number) {
      const chat = this.openChats.find(c => c.partnerId === partnerId);
      if (chat) chat.isOpen = false;
      if (this.inCall) return;
    },

    
    // ---------- ACTIVITY TRACKING ----------
    // Throttle must bind "this"
    updateMyActivity: throttle(function (this: any) {
      const myId = this.getSessionId();
      const now = Date.now();
      this.userLastActive.set(myId, now);

      if (this.connection) {
        this.connection.invoke('UpdateActivity', myId).catch((err:any) => {
          console.warn('UpdateActivity failed:', err);
        });
      }
    }, 5000), // 5 seconds

    initActivityTracking() {
      const events = ['mousemove', 'keydown', 'click', 'touchstart'];
      events.forEach(e =>
        window.addEventListener(e, () => this.updateMyActivity())
      );

      // Heartbeat every 30 seconds
      setInterval(() => this.updateMyActivity(), 30000);
    },
  }
});