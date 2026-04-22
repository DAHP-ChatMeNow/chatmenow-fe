import api from "@/lib/axios";
import { User } from "@/types/user";
import { FriendRequest } from "@/types/friend-request";

export interface ContactsResponse {
  contacts?: User[];
  friends?: User[];
  success?: boolean;
  total?: number;
}

export interface SearchUsersResponse {
  users: User[];
}

export interface AcceptFriendRequestResponse {
  success: boolean;
  friend?: User;
  conversationId?: string;
}

// Helper function to map _id to id for MongoDB compatibility
const mapMongoId = (obj: any): any => {
  if (!obj) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => mapMongoId(item));
  }
  
  if (typeof obj === 'object') {
    const mapped: any = {
      ...obj,
      id: obj._id || obj.id, // Map _id to id
    };
    
    // Handle senderId which could be string or populated object
    if (obj.senderId) {
      if (typeof obj.senderId === 'string') {
        mapped.senderId = obj.senderId;
      } else {
        // senderId is a populated object, map it and also set as sender
        mapped.senderId = mapMongoId(obj.senderId);
        mapped.sender = mapped.senderId; // Also add as sender property
      }
    }
    
    // Handle receiverId which could be string or populated object
    if (obj.receiverId) {
      if (typeof obj.receiverId === 'string') {
        mapped.receiverId = obj.receiverId;
      } else {
        // receiverId is a populated object, map it and also set as receiver
        mapped.receiverId = mapMongoId(obj.receiverId);
        mapped.receiver = mapped.receiverId; // Also add as receiver property
      }
    }
    
    return mapped;
  }
  
  return obj;
};

export const contactService = {
  getContacts: async (userId: string) => {
    const res = await api.get<ContactsResponse>(`/users/${userId}/contacts`);
    // Backend trả về 'friends', chuyển thành 'contacts' cho frontend
    const contactList = res.data.friends || res.data.contacts || [];
    const mappedContacts = contactList.map((user: any) => mapMongoId(user));
    return { contacts: mappedContacts };
  },

  searchUsers: async (params: { q?: string; city?: string; school?: string }) => {
    // We hit /users/search as indicated by backend updates
    const res = await api.get<SearchUsersResponse>("/users/search", {
      params,
    });
    if (res.data.users) {
      res.data.users = res.data.users.map((user: any) => mapMongoId(user));
    }
    return res.data;
  },

  searchAndAddFriend: async (searchTerm: string) => {
    const res = await api.post("/users/search-and-add", { searchTerm });
    return mapMongoId(res.data);
  },

  getFriendRequests: async () => {
    const res = await api.get("/users/friend-requests/pending");
    
    let mappedData;
    if (Array.isArray(res.data)) {
      mappedData = res.data.map((request: any) => mapMongoId(request));
    } else {
      mappedData = mapMongoId(res.data);
    }
    
    return mappedData;
  },

  sendFriendRequest: async (userId: string) => {
    const res = await api.post(`/users/friend-requests/${userId}`);
    return mapMongoId(res.data);
  },

  acceptFriendRequest: async (
    requestId: string,
  ): Promise<AcceptFriendRequestResponse> => {
    const res = await api.put<AcceptFriendRequestResponse>(
      `/users/friend-requests/${requestId}/accept`,
    );
    return mapMongoId(res.data);
  },

  rejectFriendRequest: async (requestId: string) => {
    const res = await api.put(`/users/friend-requests/${requestId}/reject`);
    return mapMongoId(res.data);
  },

  removeFriend: async (userId: string) => {
    const res = await api.delete(`/users/friends/${userId}`);
    return mapMongoId(res.data);
  },
};
