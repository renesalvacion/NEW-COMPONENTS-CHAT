<template>
  <div class="flex w-full h-screen font-poppins bg-slate-50 overflow-hidden">

    <!-- Sidebar / Contact List -->
    <aside
      :class="[
        'flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 z-50',
        'md:fixed md:top-0 md:left-0 md:h-screen md:w-80',
        isMobileView
          ? (selectedUser ? 'hidden' : 'fixed inset-0 w-full')
          : 'fixed top-0 left-0 h-screen w-80'
      ]"
    >
      <div class="px-5 py-4 bg-blue-600 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white tracking-wide">Messages</h2>
          <p class="text-blue-200 text-xs mt-0.5">Your conversations</p>
        </div>
        <div class="md:hidden w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
      </div>

      <div class="p-3 border-b border-slate-100 bg-white">
        <div class="flex items-center bg-slate-100 rounded-full px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400 transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M16 10a6 6 0 11-12 0 6 6 0 0112 0z"/>
          </svg>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search conversations..."
            class="bg-transparent flex-1 text-sm outline-none text-slate-700 placeholder-slate-400"
            @keyup.enter="performSearch"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <ul class="px-2 py-2 space-y-0.5">
          <li
            v-for="user in peoples"
            :key="user.id"
            @click="openChat(user)"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150',
              selectedUser?.id === user.id
                ? 'bg-blue-50 border border-blue-100'
                : 'hover:bg-slate-50 active:bg-slate-100'
            ]"
          >
            <div class="relative flex-shrink-0">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {{ user.name?.charAt(0)?.toUpperCase() }}
              </div>
              <span
                class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                :class="getStatusClass(user.id)"
              ></span>
            </div>
            <div class="flex-1 min-w-0">
              <p :class="['text-sm font-semibold truncate', selectedUser?.id === user.id ? 'text-blue-700' : 'text-slate-800']">
                {{ user.name }}
              </p>
              <p class="text-xs text-slate-400 truncate mt-0.5">Tap to open chat</p>
            </div>
            <div v-if="selectedUser?.id === user.id" class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Chat Section -->
    <section
      :class="[
        'flex flex-col bg-slate-50 transition-all duration-300',
        'md:flex-1 md:ml-80',
        isMobileView
          ? (selectedUser ? 'fixed inset-0 w-full flex' : 'hidden')
          : 'flex-1'
      ]"
    >
      <div v-if="!selectedUser" class="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div class="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-blue-300" viewBox="0 0 24 24">
            <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        </div>
        <div class="text-center">
          <p class="font-semibold text-slate-600 text-lg">No conversation selected</p>
          <p class="text-sm text-slate-400 mt-1">Pick someone from the left to start chatting</p>
        </div>
      </div>

      <div v-else class="flex flex-col h-full">

        <!-- Chat Header -->
        <div class="px-4 py-3 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-3">
            <button
              v-if="isMobileView"
              @click="goBack"
              class="p-1.5 -ml-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
            <div class="relative">
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow">
                {{ selectedUser.name.charAt(0).toUpperCase() }}
              </div>
              <span
                class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                :class="{
                  'bg-slate-400': partnerStatus === 'offline',
                  'bg-green-500': partnerStatus === 'active',
                  'bg-yellow-400': partnerStatus === 'idle'
                }"
              ></span>
            </div>
            <div>
              <p class="font-bold text-slate-800 text-sm leading-tight">{{ selectedUser.name }}</p>
              <!-- ✅ Shows "typing..." in header status too -->
              <p v-if="partnerIsTyping" class="text-xs font-medium text-blue-500 animate-pulse">
                typing...
              </p>
              <p v-else :class="['text-xs font-medium', partnerStatus === 'active' ? 'text-green-500' : partnerStatus === 'idle' ? 'text-yellow-500' : 'text-slate-400']">
                {{ partnerStatus === 'active' ? 'Active now' : partnerStatus === 'idle' ? 'Away' : 'Offline' }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button @click="startVoiceCall(selectedUser.id)" class="p-2.5 rounded-full hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.2.48 2.5.74 3.86.74a1 1 0 011 1V20a1 1 0 01-1 1c-9.39 0-17-7.61-17-17a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.26 2.66.74 3.86a1 1 0 01-.21 1.11l-2.2 2.2z"/>
              </svg>
            </button>
            <button @click="startVideoCall(selectedUser.id)" class="p-2.5 rounded-full hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5">
                <path d="M17 10.5V7c0-1.1-.9-2-2-2H3C1.9 5 1 5.9 1 7v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div
          ref="messagesEl"
          @scroll="onMessagesScroll"
          class="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-1"
          style="background: linear-gradient(180deg, #f8faff 0%, #f1f5ff 100%);"
        >

          <!-- ✅ Add these two at the very top inside the scroll div -->
  <div v-if="isLoadingMore" class="flex justify-center py-3">
    <div class="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
  <div v-if="!hasMoreMessages" class="flex justify-center py-2">
    <span class="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
      No older messages
    </span>
  </div>
          <div v-for="(group, gIndex) in messages" :key="gIndex">
            <div class="flex items-center gap-3 my-4">
              <div class="flex-1 h-px bg-slate-200"></div>
              <span class="text-xs text-slate-400 font-medium px-3 py-1 bg-white rounded-full shadow-sm border border-slate-100">
                {{ group.day }}
              </span>
              <div class="flex-1 h-px bg-slate-200"></div>
            </div>

            <div
              v-for="(msg, index) in group.messages"
              :key="msg.id ?? index"
              class="relative flex mb-1"
              :class="msg.senderId === sessionId ? 'justify-end' : 'justify-start'"
            >
              <!-- Reaction menu -->
              <div
                v-if="activeReactionId === msg.id"
                :class="[
                  'absolute bottom-full mb-2 z-50',
                  'flex gap-1.5 bg-white border border-slate-200 shadow-xl rounded-full px-3 py-2',
                  msg.senderId === sessionId ? 'right-0' : 'left-0'
                ]"
              >
                <svg @click.stop="reactionTyp(msg.id, 1); activeReactionId = null" class="w-7 h-7 cursor-pointer text-blue-500 hover:scale-125 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M23 10a2 2 0 0 0-2-2h-6.32l.96-4.57c.02-.1.03-.21.03-.32c0-.41-.17-.79-.44-1.06L14.17 1L7.59 7.58C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73zM1 21h4V9H1z"/>
                </svg>
                <img @click.stop="reactionTyp(msg.id, 2); activeReactionId = null" :src="heart" class="w-7 h-7 cursor-pointer hover:scale-125 transition-transform" />
                <img @click.stop="reactionTyp(msg.id, 3); activeReactionId = null" :src="laugh" class="w-7 h-7 cursor-pointer hover:scale-125 transition-transform" />
                <img @click.stop="reactionTyp(msg.id, 4); activeReactionId = null" :src="sad" class="w-7 h-7 cursor-pointer hover:scale-125 transition-transform" />
                <img @click.stop="reactionTyp(msg.id, 5); activeReactionId = null" :src="angry" class="w-7 h-7 cursor-pointer hover:scale-125 transition-transform" />
              </div>

              <!-- Message bubble -->
              <div
                @click="toggleReaction(msg.id)"
                :class="[
                  msg.senderId === sessionId
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                    : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-100 shadow-sm',
                  'relative px-3 md:px-4 py-2.5 break-words whitespace-pre-wrap cursor-pointer transition-all duration-150 hover:brightness-95'
                ]"
                style="max-width: 78%; margin: 0.15rem 0;"
              >
                <!-- 3-dot menu -->
                <div class="absolute -top-1 right-1 z-40 opacity-0 hover:opacity-100 transition-opacity" style="opacity: inherit;">
                  <button
                    :class="['text-xs rounded-full p-0.5 transition-colors', msg.senderId === sessionId ? 'text-blue-200 hover:text-white hover:bg-blue-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100']"
                    @click.stop="openMenuIndex = openMenuIndex === msg.id ? null : msg.id"
                    style="font-size: 1rem; font-weight: bolder; cursor: pointer;"
                  >⋯</button>
                  <div v-if="openMenuIndex === msg.id" class="absolute right-0 top-6 bg-white text-slate-700 rounded-xl shadow-lg border border-slate-100 text-xs z-50 min-w-[100px] overflow-hidden">
                    <button class="block px-4 py-2 hover:bg-red-50 hover:text-red-600 w-full text-left transition-colors" @click.stop="deleteUserMessage(msg.id); openMenuIndex = null">
                      🗑 Delete
                    </button>
                    <button class="block px-4 py-2 hover:bg-slate-50 w-full text-left transition-colors" @click.stop="openMenuIndex = null">
                      Cancel
                    </button>
                  </div>
                </div>

                <!-- Text content -->
                <div v-if="msg.content" class="pr-3 text-sm leading-relaxed">{{ msg.content }}</div>

                <!-- Error -->
                <span v-if="msg.isError" class="text-red-300 text-xs">⚠ {{ msg.errorMessage }}</span>

                <!-- Attachments -->
                <div v-if="msg.attachments?.length" class="mt-2 flex flex-col gap-2">
                  <div v-for="(file, i) in msg.attachments" :key="i">
                    <img
                      v-if="isImage(file)"
                      :src="getFileUrl(file)"
                      class="max-w-full rounded-xl cursor-zoom-in hover:opacity-90 transition-opacity shadow-sm object-cover"
                      style="max-height: 280px; min-width: 120px;"
                      @click.stop="openLightbox(getFileUrl(file))"
                      @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                    />
                    
                     <a v-else
                      :href="getFileUrl(file)"
                      target="_blank"
                      :class="[
                        'text-xs underline flex items-center gap-1.5 mt-1 px-2 py-1.5 rounded-lg',
                        msg.senderId === sessionId ? 'bg-blue-500 text-blue-100 hover:bg-blue-400' : 'bg-slate-100 text-blue-600 hover:bg-slate-200'
                      ]"
                      @click.stop
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                      </svg>
                      <span class="truncate max-w-[160px]">{{ file.filename ?? file.name ?? 'Download' }}</span>
                    </a>
                  </div>
                </div>

                <!-- Reaction -->
                <div
                  v-if="msg.reactiontype"
                  class="absolute -bottom-3 text-sm bg-white rounded-full px-1.5 py-0.5 shadow-md border border-slate-100"
                  :class="msg.senderId === sessionId ? 'right-2' : 'left-2'"
                >
                  {{ reactionEmoji(msg.reactiontype) }}
                </div>

                <!-- Timestamp -->
                <p :class="['text-[10px] mt-1.5 text-right', msg.senderId === sessionId ? 'text-blue-200' : 'text-slate-400']">
                  {{ new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <!-- END messages scroll area -->

        <!-- ✅ TYPING INDICATOR — right here between messages and input -->
        <transition name="typing">
          <div
            v-if="partnerIsTyping"
            class="px-4 py-2 flex items-center gap-2 flex-shrink-0"
            style="background: linear-gradient(180deg, #f1f5ff 0%, #ffffff 100%);"
          >
            <div class="flex items-center gap-2 bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm border border-slate-100">
              <div class="flex gap-1 items-center">
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
              </div>
              <span class="text-xs text-slate-400">{{ selectedUser?.name }} is typing...</span>
            </div>
          </div>
        </transition>

        <!-- Attachment previews -->
        <div v-if="attachments.length" class="px-3 pt-3 pb-1 flex gap-2 overflow-x-auto bg-white border-t border-slate-100 flex-shrink-0">
          <div
            v-for="(file, i) in attachments"
            :key="i"
            class="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group shadow-sm"
          >
            <img v-if="file.type?.startsWith('image/')" :src="file.preview" class="object-cover w-full h-full" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1 p-1 bg-blue-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400" viewBox="0 0 24 24">
                <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              <span class="text-[9px] text-blue-500 text-center leading-tight px-1 truncate w-full">{{ file.name }}</span>
            </div>
            <button @click="removeAttachment(i)" class="absolute -top-1 -right-1 w-5 h-5 bg-slate-600 hover:bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow transition-colors z-10">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </div>

        <!-- Input bar -->
        <div class="px-3 md:px-4 py-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0">
          <button @click="($refs.fileInput as HTMLInputElement).click()" class="cursor-pointer p-2 rounded-full hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex-shrink-0 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          </button>
          <button @click="($refs.imageInput as HTMLInputElement).click()" class="cursor-pointer p-2 rounded-full hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex-shrink-0 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </button>

          <input type="file" multiple @change="handleFiles" class="hidden" ref="fileInput" />
          <input type="file" accept="image/*" @change="handleFiles" class="hidden" ref="imageInput" />

          <!-- ✅ @input and @blur added here -->
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type a message..."
            class="flex-1 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm text-slate-700 placeholder-slate-400 transition-all"
            @keyup.enter="sendMessage"
            @input="onTyping"
            @blur="onStopTyping"
          />

          <button
            @click="sendMessage"
            class="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex-shrink-0 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Lightbox -->
    <teleport to="body">
      <transition name="lightbox">
        <div v-if="lightboxSrc" class="fixed inset-0 z-[9999] flex items-center justify-center" @click="closeLightbox">
          <div class="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <div class="relative z-10 flex flex-col items-center gap-3 p-4 max-w-[95vw] max-h-[95vh]" @click.stop>
            <div class="flex items-center justify-between w-full">
              <span class="text-white/50 text-xs">Image preview</span>
              <div class="flex items-center gap-3">
                <a :href="lightboxSrc" download class="text-white/60 hover:text-white transition-colors" @click.stop>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/>
                  </svg>
                </a>
                <button @click="closeLightbox" class="text-white/60 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>
            <img :src="lightboxSrc" class="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl object-contain select-none" draggable="false" />
          </div>
        </div>
      </transition>
    </teleport>

  </div>

  <CallScreen v-if="messengerStore.inCall" />
  <IncomingCallModal v-if="messengerStore.incomingCall" />
</template>


<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMessengerStore } from '../stores/messenger/index'
import { useAuthStore } from '#imports'
import { userPeopleStore } from '#imports'
import CallScreen from '~/components/CallScreen.vue'
import IncomingCallModal from '~/components/IncomingCallModal.vue'
import type { Attachment } from './types'

import laugh from '../../public/laugh.gif'
import heart from '../../public/heart.gif'
import sad from '../../public/sad.gif'
import angry from '../../public/angry.gif'

interface Person { id: number; name: string }

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


// ------ SCROLL MESSAGE ----------

// Add these refs
const isLoadingMore = ref(false)
const hasMoreMessages = ref(true)

const onMessagesScroll = async () => {
  if (!messagesEl.value || isLoadingMore.value || !hasMoreMessages.value) return
  if (!selectedUser.value || !sessionId.value) return
  if (messagesEl.value.scrollTop > 50) return // only trigger near the top

  isLoadingMore.value = true
  const prevScrollHeight = messagesEl.value.scrollHeight

  try {
    const chat = messengerStore.openChats.find(c => c.partnerId === selectedUser.value!.id)
    if (chat && chat.messages.length >= chat.total) {
      hasMoreMessages.value = false
      return
    }

    await messengerStore.loadOlderMessages(selectedUser.value.id, sessionId.value)

    // re-normalize from store after load
    const updated = messengerStore.openChats.find(c => c.partnerId === selectedUser.value!.id)
    if (updated) {
      const normalized = updated.messages.map((msg: any) => ({
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
      messages.value = groupMessagesByDay(normalized)
    }

    // restore scroll position so it doesn't jump to top
    await nextTick()
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight - prevScrollHeight
    }
  } finally {
    isLoadingMore.value = false
  }
}

// ── Mobile ──────────────────────────────────────────────
const windowWidth = ref(window.innerWidth)
const isMobileView = computed(() => windowWidth.value < 768)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const goBack = () => { selectedUser.value = null }

// ── Attachment helpers ───────────────────────────────────
// ✅ Checks filename/filetype since server returns { filename, filepath, filetype? }
const isImage = (file: any): boolean => {
  const type: string = file.filetype ?? file.type ?? ''
  const name: string = file.filename ?? file.name ?? file.filepath ?? ''
  if (type) return type.startsWith('image/')
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)
}

// ✅ Gets display URL — filepath is already a full URL from your server
const getFileUrl = (file: any): string => {
  if (file.preview) return file.preview        // temp local message
  if (file.filepath) return file.filepath      // server response ← THIS is the fix
  if (file.url) return file.url
  return ''
}

// ── Lightbox ────────────────────────────────────────────
const openLightbox = (src: string) => {
  if (!src) return
  lightboxSrc.value = src
  document.body.style.overflow = 'hidden'
}
const closeLightbox = () => {
  lightboxSrc.value = null
  document.body.style.overflow = ''
}
const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox() }
onMounted(() => window.addEventListener('keydown', onKeyDown))

// ── Reactions ───────────────────────────────────────────
const toggleReaction = (msgId: number | string) => {
  activeReactionId.value = activeReactionId.value === msgId ? null : msgId
}

const reactionEmoji = (type: number | null | undefined) => {
  switch (type) {
    case 1: return '👍'
    case 2: return '❤️'
    case 3: return '😂'
    case 4: return '😢'
    case 5: return '😡'
    default: return null
  }
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

// ── Group messages by day ───────────────────────────────
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

// ── Open chat ───────────────────────────────────────────
const openChat = async (user: Person) => {
  selectedUser.value = user
  hasMoreMessages.value = true  // ← add this
  isLoadingMore.value = false   // ← add this

  if (!sessionId.value) return
  let fetchedMessages: any[] = []
  try {
    const response = await messengerStore.viewMessagesPerson(sessionId.value, user.id)
    fetchedMessages = response ?? []
  } catch (err) {
    console.error('Failed to fetch messages:', err)
  }
  const normalized = fetchedMessages.map(msg => ({
    id: msg.id,
    content: msg.content ?? '',
    senderId: Number(msg.senderId ?? msg.senderid ?? 0),
    recipientId: Number(msg.recipientId ?? msg.recipientid ?? 0),
    createdAt: msg.createdAt ?? msg.createdat,
    attachments: msg.attachments ?? [],   // ✅ keep raw — getFileUrl handles field names
    isTemp: false,
    reactiontype: msg.reactiontype ?? null
  }))
  messages.value = groupMessagesByDay(normalized)
  await scrollToBottom(true)
}

// ── Send message ────────────────────────────────────────
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
    // ✅ temp attachments use preview for immediate display
    attachments: attachments.value.map(a => ({
      filename: a.name,
      filetype: a.type,
      preview: a.preview   // getFileUrl will pick this up
    })),
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

// ── Scroll ──────────────────────────────────────────────
const scrollToBottom = async (smooth = false) => {
  await nextTick()
  if (!messagesEl.value) return
  messagesEl.value.scrollTo({ top: messagesEl.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

// ── File attachments ────────────────────────────────────
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

// ── Search ──────────────────────────────────────────────
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

// ── Status ──────────────────────────────────────────────
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

// ── Calls ───────────────────────────────────────────────
const startVoiceCall = async (id: number) => { await messengerStore.startCall(id, false) }
const startVideoCall = async (id: number) => { await messengerStore.startCall(id, true) }

// ── Live message watcher (SignalR) ──────────────────────
const currentChat = computed(() =>
  messengerStore.openChats.find(c => c.partnerId === selectedUser.value?.id)
)

watch(

  () => currentChat.value?.messages?.length,
  async (newLen, oldLen) => {
  await sessionStore.fetchSession()
    if (!currentChat.value || newLen === undefined || newLen === (oldLen ?? 0)) return
    const normalized = currentChat.value.messages.map((msg: any) => ({
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
    messages.value = groupMessagesByDay(normalized)
    await scrollToBottom(true)
  },
  { deep: true }
)


// ── Typing indicator ─────────────────────────────────────
const partnerIsTyping = computed(() =>
  selectedUser.value
    ? messengerStore.typingUsers.has(selectedUser.value.id)
    : false
)

let typingTimeout: ReturnType<typeof setTimeout> | null = null
let isCurrentlyTyping = false

const onTyping = async () => {
  if (!selectedUser.value || !messengerStore.connection) return

  // Only send StartTyping once until they stop
  if (!isCurrentlyTyping) {
    isCurrentlyTyping = true
    await messengerStore.connection.invoke('StartTyping', selectedUser.value.id)
  }

  // Reset the stop-typing timer on each keystroke
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

// Stop typing if user switches chat
watch(selectedUser, () => { onStopTyping() })


watch(partnerIsTyping, async (val) => {
  if (val) await scrollToBottom(true)
})
// ── Init ────────────────────────────────────────────────
onMounted(async () => {
  await sessionStore.fetchSession()
  await peopleStore.fetchChatPeople()
  peoples.value = peopleStore.people ?? []
  messengerStore.initActivityTracking?.()
  await messengerStore.initSignalR()
})
</script>

<style scoped>
.lightbox-enter-active { transition: all 0.2s ease; }
.lightbox-leave-active { transition: all 0.15s ease; }
.lightbox-enter-from, .lightbox-leave-to { opacity: 0; transform: scale(0.97); }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.typing-enter-active { transition: all 0.2s ease; }
.typing-leave-active { transition: all 0.15s ease; }
.typing-enter-from, .typing-leave-to { opacity: 0; transform: translateY(4px); }
</style>