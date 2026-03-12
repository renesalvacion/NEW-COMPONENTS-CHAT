<template>
  <h1>Dashboard</h1>

<div class="minimizeUser" style="width: 100%; display: flex; justify-content: flex-end;">
     <!-- Sidebar: Users List -->
<aside
  :class="[
    'fixed top-0 right-0 z-50 flex flex-col bg-white border-l border-gray-200 shadow-xl transition-all duration-300',
    isOpen ? 'h-screen w-80 max-w-full' : 'h-16 w-16'
  ]"
>
  <!-- Header -->
  <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
    <h2 v-if="isOpen" class="text-lg font-semibold text-gray-800">
      Chats
    </h2>

    <!-- Collapse Button -->
    <button
      @click="isOpen = !isOpen"
      class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
    >
      <svg xmlns="http://www.w3.org/2000/svg"
           class="h-5 w-5 text-gray-600"
           fill="none"
           viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="isOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'" />
      </svg>
    </button>
  </div>

  <!-- Search -->
  <div v-if="isOpen" class="p-3 border-b border-gray-100">
    <div class="flex items-center bg-gray-100 rounded-full px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400 transition">
      <svg xmlns="http://www.w3.org/2000/svg"
           class="h-4 w-4 text-gray-500 mr-2"
           fill="none"
           viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-4.35-4.35M16 10a6 6 0 11-12 0 6 6 0 0112 0z"/>
      </svg>

      <input
        type="text"
        v-model="searchQuery"
        placeholder="Search Messenger"
        class="bg-transparent flex-1 text-sm outline-none"
        @keyup.enter="performSearch"
      />
    </div>
  </div>

  <!-- Users List -->
  <div class="flex-1 overflow-y-auto">
    <ul class="px-2 py-2 space-y-1">
      <li
        v-for="user in peoples"
        :key="user.id"
        @click="viewMessage(user.id)"
        class="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition hover:bg-gray-100"
      >
        <!-- Avatar -->
        <div class="relative">
          <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
            {{ user.name.charAt(0).toUpperCase() }}
          </div>

          <!-- Online Status -->
          <span
            class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
            :class="messengerStore.isUserOnline(user.id)
              ? (messengerStore.isUserActive(user.id)
                  ? 'bg-green-500'
                  : 'bg-yellow-400')
              : 'bg-gray-400'"
          ></span>
        </div>

        <!-- Name -->
        <div v-if="isOpen" class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate">
            {{ user.name }}
          </p>
          <p class="text-xs text-gray-500 truncate">
            Tap to chat
          </p>
        </div>
      </li>
    </ul>
  </div>


</aside>
</div>

  <!-- Chat Modal -->
<MessengerModal
  v-for="(chat, index) in openChats.filter(c => c.isOpen)"
  :key="chat.partnerId"
  :chat="chat"
  :index="index"
  
  @close="messengerStore.closeChat"
  class="bottom-0"
/>

  <!-- Incoming Call Modal (always available) -->
  <IncomingCallModal v-if="messengerStore.incomingCall" />
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import MessengerModal from '~/components/MessengerModal.vue'
import { useAuthStore } from '#imports'
import IncomingCallModal from '~/components/IncomingCallModal.vue'

import { userPeopleStore } from '#imports'

interface UserData {
  userid: number
  firstname: string
  lastname: string
  email: string
}

const sessionStore = useAuthStore()


import { useMessengerStore } from '../stores/messenger/index' 
import { storeToRefs } from 'pinia'

const messengerStore = useMessengerStore()
const { openChats } = storeToRefs(messengerStore)

const peopleStore = userPeopleStore()

const users = ref<UserData[]>([])
const isChatModal = ref(false)
const selectedPartnerId = ref<number | null>(null)


  const isOpen = ref(true)


// Fetch users from API
const fetchUsers = async () => {
  const data = await sessionStore.getUserDataChat()
  users.value = data
}

const getName = async (userId: number) => {
  await peopleStore.getRecipientName(userId)
}

// Open chat modal with selected user
const openChat = async (partnerId: number) => {
  selectedPartnerId.value = partnerId

  // Optional: fetch chat messages
  if (sessionStore.user?.userId) {
    console.log("ID" + sessionStore.user?.userId);
    console.log("Partner Id" + partnerId);
    
    
    await messengerStore.viewMessagesPerson(Number(sessionStore.user.userId), Number(partnerId))
  }

  isChatModal.value = true
}

const viewMessage = async (partnerId: number) => {
  if (!session.value?.userId) {

    
    
    await sessionStore.fetchSession()
  }
console.log("View Message session ID: " +session.value?.userId + 4);
  const userId = session.value?.userId
  console.log("UserID dashboard: " + userId);
  
  if (!userId) return

  // Load messages
  const messages = await messengerStore.viewMessagesPerson(Number(userId), Number(partnerId))

  // Ensure chat is open
  let chat = messengerStore.openChats.find(c => c.partnerId === partnerId)
  if (!chat) {
    chat = {
      partnerId,
      messages,
      isOpen: true,
      unread: 0,
      page: 1,
      total: messages.length
    }

    chat.isOpen = true
    messengerStore.openChats.push(chat)
  } else {
    chat.isOpen = true
  }
}

watch(openChats, (val) => {
  console.log('Dashboard sees chats:', val)
}, { deep: true })

watch(() => messengerStore.onlineUsers, v => {
  console.log("ONLINE USERS MAP:", v)
})

const peoples = ref <any []>([])
onMounted(async () => {
  await sessionStore.fetchSession()
  await fetchUsers()

  await peopleStore.fetchChatPeople()
  peoples.value = peopleStore.people
})


onMounted(async() => {
  sessionStore.fetchSession()
    await fetchUsers()
  messengerStore.initActivityTracking()
})
// Reactive reference to session
const session = computed(() => sessionStore.session);
</script>

<style scoped>
ul {
  list-style: none;
  padding: 0;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

aside {
  position: relative;
}
</style>
