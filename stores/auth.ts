import { defineStore } from 'pinia'
import axios from 'axios'

import { useRouter } from 'vue-router'
interface UserSession {
  userId: string
  email: string
  name: string
}

interface UserData {
  userid: number
  name: string

  email: string
}

export interface SessionType {
  email: string

  userId: number
  name: string,

}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserSession | null,
    loading: false,
    users: [] as UserData[],
    session: null as SessionType | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,

    apiUrl : () => {
        const config = useRuntimeConfig()
        return config.public.apiBase
    }
  },

  actions: {
async login(email: string, password: string) {
  this.loading = true

  try {
    await axios.post(
      `${this.apiUrl}/api/User/login`,
      { email, password }, // body
      { withCredentials: true } // credentials: 'include'
    )

    await this.fetchSession()
    return true

  } catch (err: any) {
    throw err?.response?.data || "Login failed"
  } finally {
    this.loading = false
  }
},

async fetchSession() {

  const router = useRouter()
  try {
    // Fetch user session
    const userResponse = await axios.get<UserSession>(
      `${this.apiUrl}/api/User/session`,
      { withCredentials: true }
    )

    // Fetch session type
    const sessionResponse = await axios.get<SessionType>(
      `${this.apiUrl}/api/User/session`,
      { withCredentials: true }
    )

    this.user = userResponse.data
    this.session = sessionResponse.data


    return userResponse.data
  } catch (err:any) {
    this.user = null

    if(err.response?.status === 401){

      navigateTo("/")
    }
    return null
  }
},

    async logout() {
      this.user = null
      await $fetch(`${this.apiUrl}/api/User/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    },

    // ✅ New function to fetch all users
    async getUserDataChat() {
      this.loading = true
      try {
        const data = await $fetch<UserData[]>(
          `${this.apiUrl}/api/User/users`,
          { credentials: 'include' }
        )
        this.users = data
        return data
      } catch (err) {
        console.error('Error fetching users:', err)
        this.users = []
        return []
      } finally {
        this.loading = false
      }
    }
  }
})
