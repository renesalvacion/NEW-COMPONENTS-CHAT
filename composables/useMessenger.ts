import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMessengerStore } from '../stores/messenger/index'
import { useAuthStore } from '#imports'
import { userPeopleStore } from '#imports'
import type { Attachment } from '../pages/types'

interface Person { id: number; name: string }

export function useMessenger() {
  const messengerStore = useMessengerStore()
  const sessionStore = useAuthStore()
  const peopleStore = userPeopleStore()

  const selectedUser = ref<Person | null>(null)
  const peoples = ref<Person[]>([])
  const messages = ref<any[]>([])
  const sessionId = computed(() => Number(sessionStore.user?.userId))
  const messagesEl = ref<HTMLElement | null>(null)
  const newMessage = ref('')
  const attachments = ref<Attachment[]>([])
  const openMenuIndex = ref<number | string | null>(null)
  const activeReactionId = ref<number | string | null>(null)
  const searchQuery = ref('')
  const lightboxSrc = ref<string | null>(null)
  const isLoadingMore = ref(false)
  const hasMoreMessages = ref(true)
  let lengthBeforeLoad = 0

  // ── Group messages by day ──────────────────────────────
  function groupMessagesByDay(msgs: any[]) {
    const sorted = msgs
      .map(m => ({ ...m, date: new Date(m.createdAt) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    const formatDay = (date: Date) => {
      if (date.toDateString() === today.toDateString()) return 'Today'
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }

    return sorted.reduce((acc: any[], msg) => {
      const dayLabel = formatDay(msg.date)
      const lastGroup = acc[acc.length - 1]
      if (!lastGroup || lastGroup.day !== dayLabel) acc.push({ day: dayLabel, messages: [msg] })
      else lastGroup.messages.push(msg)
      return acc
    }, [])
  }

  function normalizeMessages(raw: any[]) {
    return raw.map((msg: any) => ({
      id: msg.id,
      content: msg.content ?? '',
      senderId: Number(msg.senderId ?? msg.senderid ?? 0),
      recipientId: Number(msg.recipientId ?? msg.recipientid ?? 0),
      createdAt: msg.createdAt ?? msg.createdat,
      attachments: msg.attachments ?? [],
      isTemp: msg.isTemp ?? false,
      isError: msg.isError ?? false,
      errorMessage: msg.errorMessage ?? null,
      reactiontype: msg.reactiontype ?? null
    }))
  }

  // ── Scroll ─────────────────────────────────────────────
  const scrollToBottom = async (smooth = false) => {
    await nextTick()
    if (!messagesEl.value) return
    messagesEl.value.scrollTo({ top: messagesEl.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  // ── Load older messages on scroll ─────────────────────
 const onMessagesScroll = async () => {
  if (!messagesEl.value || isLoadingMore.value || !hasMoreMessages.value) return
  if (!selectedUser.value || !sessionId.value) return
  if (messagesEl.value.scrollTop > 50) return

  isLoadingMore.value = true
  const prevScrollHeight = messagesEl.value.scrollHeight

  try {
    const chat = messengerStore.openChats.find(c => c.partnerId === selectedUser.value!.id)
    if (!chat || chat.messages.length >= chat.total) {
      hasMoreMessages.value = false
      return  // finally will still run and reset isLoadingMore
    }

    lengthBeforeLoad = chat.messages.length

    await messengerStore.loadOlderMessages(selectedUser.value.id, sessionId.value)

    const updated = messengerStore.openChats.find(c => c.partnerId === selectedUser.value!.id)
    if (updated) {
      messages.value = groupMessagesByDay(normalizeMessages(updated.messages))
    }

    await nextTick()
    await nextTick()

    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight - prevScrollHeight
    }

  } catch (err) {
    console.error('loadOlderMessages error:', err)
  } finally {
    lengthBeforeLoad = 0
    isLoadingMore.value = false  // ← always runs, no more infinite spinner
  }
}

  // ── Open chat ──────────────────────────────────────────
  const openChat = async (user: Person) => {
    selectedUser.value = user
    hasMoreMessages.value = true
    isLoadingMore.value = false

    if (!sessionId.value) return
    try {
      const response = await messengerStore.viewMessagesPerson(sessionId.value, user.id)
      messages.value = groupMessagesByDay(normalizeMessages(response ?? []))
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
    await scrollToBottom(true)
  }

  // ── Send message ───────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedUser.value || !sessionId.value) return
    if (!newMessage.value.trim() && attachments.value.length === 0) return

    const recipientId = selectedUser.value.id
    const files = attachments.value.map(a => a.file)
    await messengerStore.initSignalR()

    const tempId = 'temp-' + Date.now()
    const tempMsg = {
      id: tempId,
      content: newMessage.value.trim(),
      senderId: sessionId.value,
      recipientId,
      attachments: attachments.value.map(a => ({ filename: a.name, filetype: a.type, preview: a.preview })),
      createdAt: new Date().toISOString(),
      isTemp: true
    }

    const dayStr = new Date(tempMsg.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const lastGroup = messages.value.find(g => g.day === dayStr)
    if (!lastGroup) messages.value.push({ day: dayStr, messages: [tempMsg] })
    else lastGroup.messages.push(tempMsg)

    newMessage.value = ''
    attachments.value = []
    await scrollToBottom(true)

    try {
      const serverMsg = await messengerStore.sendMessage(recipientId, tempMsg.content, files)
      if (!serverMsg?.id) return
      messages.value.forEach(group => {
        const idx = group.messages.findIndex((m: any) => m.id === tempId)
        if (idx !== -1) group.messages[idx] = {
          ...serverMsg,
          isTemp: false,
          senderId: Number(serverMsg.senderId ?? serverMsg.senderid ?? sessionId.value),
          recipientId: Number(serverMsg.recipientId ?? serverMsg.recipientid ?? recipientId),
          createdAt: serverMsg.createdAt ?? serverMsg.createdat,
          attachments: serverMsg.attachments ?? []
        }
      })
    } catch (err) {
      console.error('SendMessage error:', err)
      messages.value.forEach(group => {
        const idx = group.messages.findIndex((m: any) => m.id === tempId)
        if (idx !== -1) group.messages[idx].isError = true
      })
    }
    await scrollToBottom(true)
  }

  // ── Reactions ──────────────────────────────────────────
  const toggleReaction = (msgId: number | string) => {
    activeReactionId.value = activeReactionId.value === msgId ? null : msgId
  }

  const reactionEmoji = (type: number | null | undefined) => {
    const map: Record<number, string> = { 1: '👍', 2: '❤️', 3: '😂', 4: '😢', 5: '😡' }
    return type ? map[type] ?? null : null
  }

  const reactionTyp = async (messageId: number, type: number) => {
    await messengerStore.reactionMessage(messageId, type)
    messages.value.forEach(group => {
      const msg = group.messages.find((m: any) => m.id === messageId)
      if (msg) msg.reactiontype = msg.reactiontype === type ? null : type
    })
  }

  const deleteUserMessage = (messageId: number) => {
    messengerStore.deleteMessage(messageId)
    messages.value.forEach(group => {
      const idx = group.messages.findIndex((m: any) => m.id === messageId)
      if (idx !== -1) group.messages.splice(idx, 1)
    })
  }

  // ── File attachments ───────────────────────────────────
  const isImage = (file: any): boolean => {
    const type: string = file.filetype ?? file.type ?? ''
    const name: string = file.filename ?? file.name ?? file.filepath ?? ''
    if (type) return type.startsWith('image/')
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)
  }

  const getFileUrl = (file: any): string => {
    if (file.preview) return file.preview
    if (file.filepath) return file.filepath
    if (file.url) return file.url
    return ''
  }

  const handleFiles = (e: Event) => {
    const files = (e.target as HTMLInputElement).files
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) return
      attachments.value.push({ file, name: file.name, type: file.type, preview: URL.createObjectURL(file) })
    }
  }

  const removeAttachment = (index: number) => attachments.value.splice(index, 1)

  // ── Lightbox ───────────────────────────────────────────
  const openLightbox = (src: string) => {
    if (!src) return
    lightboxSrc.value = src
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    lightboxSrc.value = null
    document.body.style.overflow = ''
  }

  // ── Search ─────────────────────────────────────────────
  const performSearch = () => {
    if (!searchQuery.value.trim()) {
      peopleStore.fetchChatPeople().then(() => { peoples.value = peopleStore.people ?? [] })
      return
    }
    peoples.value = (peopleStore.people ?? []).filter((p: Person) =>
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  watch(searchQuery, performSearch)

  // ── Status ─────────────────────────────────────────────
  const getStatusClass = (id: number) =>
    messengerStore.isUserOnline?.(id)
      ? (messengerStore.isUserActive?.(id) ? 'bg-green-500' : 'bg-yellow-400')
      : 'bg-slate-400'

  const partnerStatus = computed(() => {
    if (!selectedUser.value) return 'offline'
    const id = selectedUser.value.id
    if (!messengerStore.isUserOnline?.(id)) return 'offline'
    return messengerStore.isUserActive?.(id) ? 'active' : 'idle'
  })

  // ── Calls ──────────────────────────────────────────────
  const startVoiceCall = async (id: number) => { await messengerStore.startCall(id, false) }
  const startVideoCall = async (id: number) => { await messengerStore.startCall(id, true) }



  // ── Mobile ─────────────────────────────────────────────
  const windowWidth = ref(window.innerWidth)
  const isMobileView = computed(() => windowWidth.value < 768)
  const onResize = () => { windowWidth.value = window.innerWidth }
  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  const goBack = () => {
    selectedUser.value = null
    localStorage.removeItem('lastSelectedUser')
  }

  // ── Typing ─────────────────────────────────────────────
  const partnerIsTyping = computed(() =>
    selectedUser.value ? messengerStore.typingUsers.has(selectedUser.value.id) : false
  )

  let typingTimeout: ReturnType<typeof setTimeout> | null = null
  let isCurrentlyTyping = false

  const onTyping = async () => {
    if (!selectedUser.value || !messengerStore.connection) return
    if (!isCurrentlyTyping) {
      isCurrentlyTyping = true
      await messengerStore.connection.invoke('StartTyping', selectedUser.value.id)
    }
    if (typingTimeout) clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => onStopTyping(), 2000)
  }

  const onStopTyping = async () => {
    if (!isCurrentlyTyping) return
    isCurrentlyTyping = false
    if (typingTimeout) { clearTimeout(typingTimeout); typingTimeout = null }
    if (!selectedUser.value || !messengerStore.connection) return
    await messengerStore.connection.invoke('StopTyping', selectedUser.value.id)
  }

  watch(selectedUser, () => { onStopTyping() })
  watch(partnerIsTyping, async (val) => { if (val) await scrollToBottom(true) })

  // ── SignalR live watcher ───────────────────────────────
  const currentChat = computed(() =>
    messengerStore.openChats.find(c => c.partnerId === selectedUser.value?.id)
  )

  watch(
    () => currentChat.value?.messages?.length,
    async (newLen, oldLen) => {
      if (!currentChat.value || newLen === undefined) return
      if (isLoadingMore.value || lengthBeforeLoad > 0) return
      if (newLen === (oldLen ?? 0)) return

      messages.value = groupMessagesByDay(normalizeMessages(currentChat.value.messages))

      const lastMsg = currentChat.value.messages[currentChat.value.messages.length - 1]
      const isIncoming = Number(lastMsg?.senderId ?? lastMsg?.senderid) !== sessionId.value
      if (isIncoming) await scrollToBottom(true)
    },
    { deep: true }
  )

  // ── localStorage ───────────────────────────────────────
  watch(selectedUser, (user) => {
    if (user) localStorage.setItem('lastSelectedUser', JSON.stringify(user))
    else localStorage.removeItem('lastSelectedUser')
  })

  // ── Init ───────────────────────────────────────────────
  onMounted(async () => {
    await sessionStore.fetchSession()
    await peopleStore.fetchChatPeople()
    peoples.value = peopleStore.people ?? []
    messengerStore.initActivityTracking?.()
    await messengerStore.initSignalR()

    const saved = localStorage.getItem('lastSelectedUser')
    if (saved) {
      try {
        const lastUser = JSON.parse(saved)
        const exists = peoples.value.find((p: Person) => p.id === lastUser.id)
        if (exists) await openChat(exists)
        else localStorage.removeItem('lastSelectedUser')
      } catch {
        localStorage.removeItem('lastSelectedUser')
      }
    }
  })

  const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox() }
  onMounted(() => window.addEventListener('keydown', onKeyDown))

  return {
    // state
    selectedUser, peoples, messages, sessionId, messagesEl,
    newMessage, attachments, openMenuIndex, activeReactionId,
    searchQuery, lightboxSrc, isLoadingMore, hasMoreMessages,
    isMobileView, partnerStatus, partnerIsTyping,
    messengerStore,
    // methods
    openChat, sendMessage, goBack, onMessagesScroll,
    toggleReaction, reactionEmoji, reactionTyp, deleteUserMessage,
    isImage, getFileUrl, handleFiles, removeAttachment,
    openLightbox, closeLightbox,
    getStatusClass, startVoiceCall, startVideoCall,
    onTyping, onStopTyping,
  }
}