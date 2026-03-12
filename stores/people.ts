import { defineStore } from 'pinia'
import axios from 'axios'
import { useAuthStore } from '#imports'
import qs from 'qs'


interface Person {
  id: number
  name: string
}
export const userPeopleStore = defineStore('people', {
  state: () => ({
    ids: [] as any [],
    id: [] as Number [],
    name: "",
     people: [] as Person[],
  }),

  getters: {
        apiUrl : () => {
        const config = useRuntimeConfig()
        return config.public.apiBase
    },

    chatApiUrl : () => {
        const config = useRuntimeConfig()
        return config.public.chatApi
    }
  },

  actions: {
async fetchChatPeople() {
  const authStore = useAuthStore()
  const senderId = authStore.user?.userId
  if (!senderId) return

  try {
    // 1️⃣ Fetch IDs
    const historyRes = await axios.get(
      `${this.chatApiUrl}/api/chat/People-history/${senderId}`,
      { withCredentials: true }
    )

    const ids: number[] = historyRes.data.people.map(Number)

    if (!ids.length) return

    // 2️⃣ Fetch Names
const namesRes = await axios.get(
  `${this.apiUrl}/api/User/People-names`,
  {
    params: { userIds: ids },
    paramsSerializer: params =>
      qs.stringify(params, { arrayFormat: 'repeat' }),
    withCredentials: true
  }
)
    this.people = namesRes.data.users

    console.log("People:", this.people)

  } catch (error) {
    console.error("Error fetching chat people:", error)
  }
},
async getRecipientName(userId: number){
    try {
        const response = await axios.get(`${this.apiUrl}/api/User/recipientName/${userId}`)
        this.name = response.data
        console.log("Name: " + response.data);
        
    } catch (error) {
        console.log(error);
        
    }
}

  }
})
