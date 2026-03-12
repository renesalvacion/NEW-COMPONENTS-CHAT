import { defineStore } from 'pinia'
import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '#imports';
interface SdpDto {
  Type: RTCSdpType;
  Sdp: string;
}

interface IceCandidateDto {
  Candidate: string;
  SdpMid?: string | null;
  SdpMLineIndex?: number | null;
}

export const useMessengerStore = defineStore('chat', {
  state: () => ({
    openChats: [] as {
      partnerId: number
      messages: any[]
      isOpen: boolean
      unread: number
      page: number
      total: number
    }[],
    connection: null as signalR.HubConnection | null,
    remoteStream: null as MediaStream | null,
    iceQueue: [] as RTCIceCandidateInit[],

    peer: null as RTCPeerConnection | null,
    localStream: null as MediaStream | null,
    inCall: false,
    currentCallUserId: null as number | null,
    currentCallId: null as number | null,
    callStartTime: 0,
    showCallScreen: false,
    showIncomingCallModal: false,
    incomingCall: null as {
      fromUserId: number
      video: boolean
      offer?: RTCSessionDescriptionInit
    } | null,
    callErrors: [] as string[],


    
  }),

  getters: {
    apiUrl: () => {
      const config = useRuntimeConfig()
      return config.public.chatApi
    }
  },

  actions: {


    cleanupCall() {
  console.log('🧹 Cleaning up call...')

  // 🔌 Close peer connection
  if (this.peer) {
    try {
      this.peer.ontrack = null
      this.peer.onicecandidate = null
      this.peer.close()
    } catch (err) {
      console.warn('Peer close error:', err)
    }
  }

  this.peer = null

  // 🎤 Stop local media tracks
  if (this.localStream) {
    this.localStream.getTracks().forEach(track => {
      try {
        track.stop()
      } catch {}
    })
  }

  this.localStream = null

  // 📺 Clear remote stream
  if (this.remoteStream) {
    this.remoteStream.getTracks().forEach(track => {
      try {
        track.stop()
      } catch {}
    })
  }

  this.remoteStream = null

  // 🧊 Clear ICE queue
  this.iceQueue = []

  // 🧾 Reset call state
  this.inCall = false
  this.incomingCall = null
  this.currentCallUserId = null
  this.currentCallId = null
  this.callStartTime = 0

  // 🖥 Reset UI
  this.showCallScreen = false
  this.showIncomingCallModal = false

  console.log('✅ Call cleaned up successfully')
},

    async initSignalR() {
  if (this.connection) return
    const authStore = useAuthStore()
    const userId = authStore.user?.userId



 this.connection = new signalR.HubConnectionBuilder()
  .withUrl(`https://localhost:5257/hubs/messenger`, {
    skipNegotiation: false,
    withCredentials: true // ✅ send cookies
  })
  .withAutomaticReconnect()
  .build();


  /* ========================================
     RECEIVE OFFER
  ======================================== */
  this.connection.on('ReceiveOffer', async (offerPayload: any, fromUserId: number) => {

    if (!offerPayload?.sdp) return

    this.incomingCall = {
      fromUserId,
      video: offerPayload.sdp.includes('m=video'),
      offer: {
        type: (offerPayload.type?.toLowerCase() as RTCSdpType) ?? 'offer',
        sdp: offerPayload.sdp
      }
    }

    this.showIncomingCallModal = true
    this.showCallScreen = false

    await this.viewMessagePerson(fromUserId, fromUserId)
  })

  /* ========================================
     RECEIVE MESSAGE
  ======================================== */
  this.connection.on('ReceiveMessage', (message: any) => {
    const authStore = useAuthStore()
    const myId = authStore.user?.userId

    if (message.senderId === myId) return

    let chat = this.openChats.find(c => c.partnerId === message.senderId)

    if (!chat) {
      chat = {
        partnerId: message.senderId,
        messages: [],
        isOpen: true,
        unread: 0,
        page: 1,
        total: 0
      }
      this.openChats.push(chat)
    }

    chat.messages.push(message)
  })

  /* ========================================
     RECEIVE ANSWER
  ======================================== */
  this.connection.on('ReceiveAnswer', async (answer: any) => {

    if (!this.peer) return

    const normalized = {
      type: answer.type ?? answer.Type,
      sdp: answer.sdp ?? answer.Sdp
    }

    if (!normalized.type || !normalized.sdp) return

    await this.peer.setRemoteDescription(
      new RTCSessionDescription(normalized)
    )

    // Add queued ICE
    for (const c of this.iceQueue) {
      try {
        await this.peer.addIceCandidate(new RTCIceCandidate(c))
      } catch {}
    }

    this.iceQueue = []
  })

  /* ========================================
     RECEIVE ICE
  ======================================== */
  this.connection.on('ReceiveIce', async (candidate: any) => {

    const candidateStr = candidate.Candidate ?? candidate.candidate
    const sdpMid = candidate.SdpMid ?? candidate.sdpMid
    const sdpMLineIndex = candidate.SdpMLineIndex ?? candidate.sdpMLineIndex

    if (!candidateStr) return

    const ice: RTCIceCandidateInit = {
      candidate: candidateStr,
      sdpMid,
      sdpMLineIndex
    }

    if (!this.peer || !this.peer.remoteDescription) {
      this.iceQueue.push(ice)
      return
    }

    try {
      await this.peer.addIceCandidate(new RTCIceCandidate(ice))
    } catch (e) {
      console.error('ICE add failed', e)
    }
  })

  /* ========================================
     CALL HUNG UP
  ======================================== */
  this.connection.on('CallHungUp', () => {
    this.cleanupCall()
  })

  /* ========================================
     CALL REJECTED
  ======================================== */
  this.connection.on('CallRejected', () => {
    this.cleanupCall()
    alert('Your call was rejected')
  })

  /* ========================================
     START CONNECTION
  ======================================== */
  try {
    await this.connection.start()
    console.log('✅ SignalR connected')
  } catch (err) {
    console.error('❌ SignalR failed to connect', err)
  }
},

async autoInit() {
  if (!this.connection) await this.initSignalR()

  if (
    this.connection &&
    this.connection.state !== signalR.HubConnectionState.Connected
  ) {
    await this.connection.start()
  }
},

    /* ======================================================
       VIEW MESSAGE (FETCH VERSION)
    ====================================================== */
    async viewMessagePerson(userId: number, partnerId: number) {
      let chat = this.openChats.find(c => c.partnerId === partnerId)

      if (!chat) {
        chat = {
          partnerId,
          messages: [],
          isOpen: true,
          unread: 0,
          page: 1,
          total: 0
        }
        this.openChats.push(chat)
      } else {
        chat.isOpen = true
      }

      chat.unread = 0

      const token = localStorage.getItem('token')

    const res = await fetch(
  `https://localhost:5257/api/chat/view-person-message/${userId}/${partnerId}?page=1&pageSize=20`,
  {
    method: 'GET',
    credentials: 'include', // ✅ important: send cookies
    headers: {
      'Accept': 'application/json'
    }
  }
);


      if (!res.ok) throw new Error('Failed to fetch messages')

      const data = await res.json()

      chat.messages = data.messages
      chat.total = data.totalMessages
      chat.page = 1

      return chat.messages
    },

    /* ======================================================
       LOAD OLDER MESSAGES
    ====================================================== */
    async loadOlderMessages(partnerId: number, userId: number) {
      const chat = this.openChats.find(c => c.partnerId === partnerId)
      if (!chat || chat.messages.length >= chat.total) return

      const token = localStorage.getItem('token')
      const nextPage = chat.page + 1

      const res = await fetch(
        `https://localhost:5257/api/chat/view-person-message/${userId}/${partnerId}?page=${nextPage}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!res.ok) throw new Error('Failed to load older messages')

      const data = await res.json()

      chat.messages = [...data.messages, ...chat.messages]
      chat.page = nextPage
      chat.isOpen = true
    },

    /* ======================================================
       SEND MESSAGE (UPLOAD USING FETCH)
    ====================================================== */
    async sendMessage(receiverId: number, content: string, files: File[]) {

    const authStore = useAuthStore()
    const senderId = authStore.user?.userId

      const token = localStorage.getItem('token')
      if (!senderId || !token) return

      let chat = this.openChats.find(c => c.partnerId === receiverId)
      if (!chat) {
        chat = { partnerId: receiverId, messages: [], isOpen: true, unread: 0, page: 1, total: 0 }
        this.openChats.push(chat)
      }

      /* -----------------------------
         FILE UPLOAD (FETCH)
      ----------------------------- */
      const uploadedAttachments: any[] = []

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(
          `https://localhost:5257/api/chat/upload`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData
          }
        )

        if (!res.ok) throw new Error('Upload failed')

        const data = await res.json()

        uploadedAttachments.push({
          filename: data.filename,
          filepath: data.filepath,
          filetype: file.type
        })
      }
  const id = Number(receiverId);
  if (isNaN(id)) throw new Error("Invalid receiverId: " + receiverId);

      /* -----------------------------
         SEND VIA SIGNALR
      ----------------------------- */
      if (!this.connection) await this.initSignalR()
      if (!this.connection) return

      return await this.connection.invoke(
        'SendMessage',
        id,
        content ?? "",
        uploadedAttachments
      )
    },

    /* ======================================================
       DELETE MESSAGE (PATCH → FETCH)
    ====================================================== */
    async deleteMessage(userId: number, messageId: number) {
      const token = localStorage.getItem('token')

      const res = await fetch(
        `${this.apiUrl}/api/chat/delete-message/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ messageId })
        }
      )

      const data = await res.json()

      if (!res.ok) {
        alert('Error: ' + data.message)
        return
      }

      alert('Message: ' + data.message)
    },

    /* ======================================================
       REACTION MESSAGE (POST → FETCH)
    ====================================================== */
    async reactionMessage(messageId: number, reactionType: number) {

      const token = localStorage.getItem('token')

      const res = await fetch(
        `${this.apiUrl}/api/chat/react/${messageId}/${reactionType}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await res.json()

      if (!res.ok) {
        console.error(data)
        return
      }

      console.log("Message:", data.message)
    },

    
  logCallError(message: string) {
    console.error('📝 Call error logged:', message);
    this.callErrors.push(message);
  },

  getCallDurationInSeconds(): number {
  if (!this.callStartTime) return 0;
  return Math.floor((Date.now() - this.callStartTime) / 1000);
},
async startCall(
  partnerId: number,
  video = false,
  remoteVideoEl?: HTMLVideoElement | null
) {
  console.group('📞 startCall');
  console.log('Partner ID:', partnerId, 'Video enabled:', video);

  if (this.inCall) {
    console.warn('Already in a call');
    console.groupEnd();
    return;
  }

  if (!this.connection) {
    await this.initSignalR();
    if (!this.connection) {
      console.error('SignalR not initialized');
      console.groupEnd();
      return;
    }
  }

  // Validate partnerId
  if (!partnerId || isNaN(Number(partnerId))) {
    console.error("❌ Invalid partnerId, cannot start call");
    this.logCallError("Invalid partnerId: " + partnerId);
    console.groupEnd();
    return;
  }

  try {
    // 0️⃣ Attempt to start the call on the server
    let callId: number | null = null;
    try {
      callId = await this.connection!.invoke<number>("StartCall", Number(partnerId), video);
      this.currentCallId = callId;
       // ✅ Mark start time here
    this.callStartTime = Date.now();
    console.log('✅ Call created with id', callId, 'Start time set at', new Date(this.callStartTime).toISOString());

      console.log('✅ Call created with id', callId);
    } catch (err: any) {
      const serverError = err?.message ?? JSON.stringify(err);
      this.logCallError("StartCall HubException: " + serverError);
      console.error('❌ startCall failed (server error):', serverError);
      alert('Cannot start call: ' + serverError);
      console.groupEnd();
      return;
    }

    // 1️⃣ Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    console.log('Local media acquired:', this.localStream.getTracks().map(t => t.kind));

    // 2️⃣ Create remote stream
    this.remoteStream = new MediaStream();

    // 3️⃣ Create peer connection
    this.peer = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    } as RTCConfiguration);

    // 4️⃣ Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.peer!.addTrack(track, this.localStream!);
    });
    console.log('Senders after addTrack:', this.peer.getSenders().map(s => s.track?.kind));

    // 5️⃣ Handle remote tracks
    this.peer.ontrack = (event) => {
      if (!this.remoteStream) this.remoteStream = new MediaStream();
      this.remoteStream.addTrack(event.track);
      this.remoteStream = new MediaStream(this.remoteStream.getTracks());

      console.log('📊 Remote stream tracks:', {
        total: this.remoteStream.getTracks().length,
        video: this.remoteStream.getVideoTracks().length,
        audio: this.remoteStream.getAudioTracks().length
      });

      // Update video element if provided
      if (remoteVideoEl && remoteVideoEl.srcObject !== this.remoteStream) {
        remoteVideoEl.srcObject = this.remoteStream;
        remoteVideoEl.autoplay = true;
        remoteVideoEl.playsInline = true;
        remoteVideoEl.muted = false;
        remoteVideoEl.play().catch(err => console.warn('Remote video play failed', err));
      }
    };

    // 6️⃣ ICE candidates
    const iceQueue: RTCIceCandidateInit[] = [];
    this.peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const payload: IceCandidateDto = {
        Candidate: event.candidate.candidate,
        SdpMid: event.candidate.sdpMid ?? null,
        SdpMLineIndex: event.candidate.sdpMLineIndex ?? null
      };

      if (this.peer!.remoteDescription?.type) {
        this.connection!.invoke('SendIce', Number(partnerId), payload)
          .catch(err => this.logCallError('SendIce failed: ' + err?.message));
      } else {
        iceQueue.push(event.candidate);
      }
    };

    // 7️⃣ Create offer
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    await this.connection!.invoke('SendOffer', Number(partnerId), {
      Type: offer.type ?? 'offer',
      Sdp: offer.sdp ?? ''
    } as SdpDto);

    this.inCall = true;
    this.showCallScreen = true;
    console.log('Call started — waiting for answer');
  } catch (err: any) {
    const errorMsg = err?.message ?? JSON.stringify(err);
    this.logCallError("startCall frontend error: " + errorMsg);
    console.error('❌ startCall failed:', errorMsg);
    alert('Cannot access mic/camera or start call: ' + errorMsg);
  } finally {
    console.groupEnd();
  }
},



/** ----------------------
 * ACCEPT CALL (Callee)
 * ---------------------- */
async acceptCall(
  offerPayload: { type: string; sdp: string; callId?: string },
  partnerId: number,
  remoteVideoEl?: HTMLVideoElement
) {
  console.group('📞 acceptCall');
  console.log('Partner ID:', partnerId);

  if (this.inCall) {
    console.warn('Already in call');
    console.groupEnd();
    return;
  }

  if (!offerPayload?.sdp) {
    console.error('No valid offer payload');
    console.groupEnd();
    return;
  }

  if (!this.connection) await this.initSignalR();
  if (!this.connection) {
    console.error('SignalR unavailable');
    console.groupEnd();
    return;
  }

  try {
    const hasVideo = offerPayload.sdp.includes('m=video');
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: hasVideo });
    console.log('Local media acquired:', this.localStream.getTracks().map(t => t.kind));

    this.remoteStream = new MediaStream();

    this.peer = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    } as RTCConfiguration);

    // 1️⃣ Add local tracks BEFORE setRemoteDescription
    this.localStream.getTracks().forEach(track => this.peer!.addTrack(track, this.localStream!));
    console.log('Senders after addTrack:', this.peer.getSenders().map(s => s.track?.kind));

    // 2️⃣ Handle remote tracks
    this.peer.ontrack = (event) => {
      console.log('📥 Remote track received:', {
        kind: event.track.kind,
        id: event.track.id,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streams: event.streams.length
      });
      
      // Ensure remoteStream exists
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      
      // Add track to remote stream
      this.remoteStream.addTrack(event.track);
      
      // Assign new reference so Vue/Pinia watchers re-run (they only see reference change)
      this.remoteStream = new MediaStream(this.remoteStream.getTracks());
      
      console.log('📊 Remote stream tracks:', {
        total: this.remoteStream.getTracks().length,
        video: this.remoteStream.getVideoTracks().length,
        audio: this.remoteStream.getAudioTracks().length
      });

      // Update video element if provided (fallback for direct assignment)
      if (remoteVideoEl && remoteVideoEl.srcObject !== this.remoteStream) {
        remoteVideoEl.srcObject = this.remoteStream;
        remoteVideoEl.autoplay = true;
        remoteVideoEl.playsInline = true;
        remoteVideoEl.muted = false;
        remoteVideoEl
          .play()
          .then(() => console.log('✅ Remote video playing (direct assignment)'))
          .catch(err => console.warn('Remote video play failed', err));
      }
      
      // Ensure audio tracks are enabled
      event.track.onended = () => {
        console.log(`Track ended: ${event.track.kind} (${event.track.id})`);
      };
    };

    // 3️⃣ ICE candidates (callee: send to caller via SignalR)
    this.peer.onicecandidate = async (event) => {
      if (!event.candidate || !this.connection) return;

      const iceCandidate: IceCandidateDto = {
        Candidate: event.candidate.candidate,
        SdpMid: event.candidate.sdpMid ?? null,
        SdpMLineIndex: event.candidate.sdpMLineIndex ?? null
      };

      console.log('🧊 acceptCall: sending ICE candidate (SendIce)', {
        toPartnerId: partnerId,
        sdpMid: iceCandidate.SdpMid,
        sdpMLineIndex: iceCandidate.SdpMLineIndex,
        candidateSnippet: iceCandidate.Candidate?.slice(0, 80) + (iceCandidate.Candidate?.length > 80 ? '…' : '')
      });
      await this.connection.invoke('SendIce', Number(partnerId), iceCandidate);
    };





    // 4️⃣ Set remote description
    await this.peer.setRemoteDescription({ type: offerPayload.type as RTCSdpType, sdp: offerPayload.sdp });

    // 5️⃣ Create and send answer
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
await this.connection.invoke('SendAnswer', Number(partnerId), {
  Type: answer.type ?? 'answer',
  Sdp: answer.sdp ?? ''
} as SdpDto);

    this.inCall = true;
    this.showCallScreen = true;
    this.currentCallUserId = partnerId;
    this.currentCallId = Number(offerPayload.callId) || null;

    console.log('Call accepted successfully');
  } catch (err) {
    console.error('❌ acceptCall failed:', err);
    alert('Cannot access mic/camera or accept call.');
  } finally {
    console.groupEnd();
  }
},

  }

  
})
