import * as signalR from '@microsoft/signalr';
import type { SdpDto, IceCandidateDto } from './types';
import type { useMessengerStore } from './index'

let signalRStarted = false

export async function initSignalR(store: ReturnType<typeof useMessengerStore>) {
  if (signalRStarted && store.connection?.state === signalR.HubConnectionState.Connected) return
  signalRStarted = true

  if (store.connection) {
    try { await store.connection.stop() } catch {}
    store.connection = null
  }

  store.connection = new signalR.HubConnectionBuilder()
    .withUrl(`${store.apiUrl}/hubs/messenger`, { withCredentials: true })
    .withAutomaticReconnect()
    .build()

  setupMessageEvents(store)
  setupCallEvents(store)
  setupStatusEvents(store)

  await store.connection.start()
  console.log('✅ SignalR connected')
}

function setupMessageEvents(store: ReturnType<typeof useMessengerStore>) {
  store.connection?.on('ReceiveMessage', (msg: any) => {
    const normalized = {
      id: msg.id,
      senderId: msg.senderId ?? msg.senderid,
      recipientId: msg.recipientId ?? msg.recipientid,
      content: msg.content,
      createdAt: msg.createdAt ?? msg.createdat,
      attachments: msg.attachments ?? []
    }

    // Skip if it's our own message echoed back (we already have a temp message)
    if (normalized.senderId === store.getSessionId()) return

    const partnerId = normalized.senderId
    let chat = store.openChats.find(c => c.partnerId === partnerId)

    if (!chat) {
      chat = {
        partnerId,
        messages: [],
        isOpen: false,
        unread: 1,
        page: 1,
        total: 1
      }
      store.openChats.push(chat)
    }

    const exists = chat.messages.some((m: any) => m.id === normalized.id)
    if (!exists) {
      // ✅ Reassign to trigger Pinia reactivity
      chat.messages = [...chat.messages, normalized]
      if (!chat.isOpen) chat.unread++
    }
  })
}

function setupCallEvents(store: ReturnType<typeof useMessengerStore>) {
  // Buffer for offer that arrives before IncomingCall
  let pendingOffer: { type: string; sdp: string } | null = null

  store.connection?.on('IncomingCall', (fromUserId: number, video: boolean, callId: number) => {
    console.log('📞 IncomingCall received from', fromUserId, 'callId:', callId)

    // ✅ Merge pending offer if it already arrived
    store.incomingCall = {
      fromUserId,
      video,
      callId,
      offer: pendingOffer ?? null
    }
    store.showIncomingCallModal = true

    if (pendingOffer) {
      console.log('✅ Merged pending offer into IncomingCall')
      pendingOffer = null
    }
  })

store.connection?.on('ReceiveOffer', (offer: any, fromUserId: number) => {
  console.log('📡 ReceiveOffer raw payload:', JSON.stringify(offer))

  // ✅ Handle both PascalCase (C# default) and camelCase (SignalR serializer)
  const offerPayload = {
    type: offer.Type ?? offer.type ?? 'offer',
    sdp: offer.Sdp ?? offer.sdp ?? ''
  }

  console.log('📡 Parsed offer:', { type: offerPayload.type, sdpLength: offerPayload.sdp.length })

  if (!offerPayload.sdp) {
    console.error('❌ SDP is empty after parsing — check server serialization')
    return
  }

  if (store.incomingCall) {
    store.incomingCall = { ...store.incomingCall, offer: offerPayload }
    console.log('✅ Offer merged into existing incomingCall')
  } else {
    pendingOffer = offerPayload
    console.log('⏳ Offer buffered, waiting for IncomingCall')
  }
})

  store.connection?.on('ReceiveAnswer', async (answer: SdpDto) => {
    console.log('📡 ReceiveAnswer')
    if (!store.peer) return
    try {
      await store.peer.setRemoteDescription({
        type: answer.Type as RTCSdpType,
        sdp: answer.Sdp
      })
      for (const candidate of store.iceQueue ?? []) {
        await store.peer.addIceCandidate(new RTCIceCandidate(candidate))
      }
      store.iceQueue = []
      console.log('✅ Remote description set, ICE queue flushed')
    } catch (err) {
      console.error('❌ ReceiveAnswer error:', err)
    }
  })

  store.connection?.on('ReceiveIce', async (candidate: IceCandidateDto) => {
    const rtcCandidate: RTCIceCandidateInit = {
      candidate: candidate.Candidate,
      sdpMid: candidate.SdpMid ?? null,
      sdpMLineIndex: candidate.SdpMLineIndex ?? null
    }
    if (!store.peer || !store.peer.remoteDescription) {
      store.iceQueue = [...(store.iceQueue ?? []), rtcCandidate]
      return
    }
    try {
      await store.peer.addIceCandidate(new RTCIceCandidate(rtcCandidate))
    } catch (err) {
      console.error('❌ addIceCandidate error:', err)
    }
  })

  store.connection?.on('CallEnded', (callId: number, durationInSeconds: number, endedAt: string) => {
    console.log('📞 CallEnded', { callId, durationInSeconds, endedAt })
    pendingOffer = null
    store.cleanupCall()
  })

  store.connection?.on('CallRejected', () => {
    console.log('📞 CallRejected')
    pendingOffer = null
    alert('Call was declined.')
    store.cleanupCall()
  })

  store.connection?.on('CallHungUp', (fromUserId: string) => {
    console.log('📞 CallHungUp by', fromUserId)
    pendingOffer = null
    store.cleanupCall()
  })

  // Inside your setupCallEvents or wherever you setup SignalR listeners
store.connection?.on('UserTyping', (fromUserId: number) => {
  store.typingUsers = new Set([...store.typingUsers, fromUserId])
})

store.connection?.on('UserStoppedTyping', (fromUserId: number) => {
  const updated = new Set(store.typingUsers)
  updated.delete(fromUserId)
  store.typingUsers = updated
})
}

function setupStatusEvents(store: ReturnType<typeof useMessengerStore>) {
  store.connection?.on('OnlineUsersList', (ids: number[]) => {
    const online = new Map<number, boolean>()
    const activity = new Map<number, number>()
    ids.forEach(id => {
      online.set(Number(id), true)
      activity.set(Number(id), Date.now())
    })
    store.onlineUsers = online
    store.userLastActive = activity
  })

  store.connection?.on('UserOnline', (id: number) => {
    const online = new Map(store.onlineUsers)
    online.set(Number(id), true)
    store.onlineUsers = online

    const activity = new Map(store.userLastActive)
    activity.set(Number(id), Date.now())
    store.userLastActive = activity
  })

  store.connection?.on('UserOffline', (id: number) => {
    const online = new Map(store.onlineUsers)
    online.delete(Number(id))
    store.onlineUsers = online
  })

  store.connection?.on('UserActive', (id: number) => {
    const activity = new Map(store.userLastActive)
    activity.set(Number(id), Date.now())
    store.userLastActive = activity
  })
}

export async function ensureSignalRConnection(
  store: ReturnType<typeof useMessengerStore>,
  force = false
) {
  if (force && store.connection) {
    try { await store.connection.stop() } catch {}
    store.connection = null
    signalRStarted = false
  }

  if (!store.connection || store.connection.state !== signalR.HubConnectionState.Connected) {
    await store.initSignalR()
  }
}