// services/socketService.js
import { io } from 'socket.io-client';

// Socket.IO client instance
let socket = null;

// Initialize socket connection
export const initSocket = () => {
  if (!socket) {
    socket = io('https://my-api.ficlub.az', {
      transports: ['polling'], // istəsən ['websocket', 'polling'] də yaza bilərsən
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }

  return socket;
};

// Get socket instance
export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket event handlers
export const socketEvents = {
  // Listen for customer updates
  onCustomerUpdated: (callback) => {
    const socket = getSocket();
    socket.on('customer_updated', callback);
    return () => socket.off('customer_updated', callback);
  },

  onCustomerCreated: (callback) => {
    const socket = getSocket();
    socket.on('customer_created', callback);
    return () => socket.off('customer_created', callback);
  },

  onCustomerDeleted: (callback) => {
    const socket = getSocket();
    socket.on('customer_deleted', callback);
    return () => socket.off('customer_deleted', callback);
  },

  emitCustomerUpdated: (data) => {
    const socket = getSocket();
    socket.emit('customer_updated', data);
  },

  emitCustomerCreated: (data) => {
    const socket = getSocket();
    socket.emit('customer_created', data);
  },

  emitCustomerDeleted: (data) => {
    const socket = getSocket();
    socket.emit('customer_deleted', data);
  },

  // Join room
  joinRoom: (room) => {
    const socket = getSocket();
    socket.emit('join_room', room);
  },

  leaveRoom: (room) => {
    const socket = getSocket();
    socket.emit('leave_room', room);
  },

  // Card scan
  onCardScanned: (callback) => {
    const socket = getSocket();
    socket.on('card_scanned', callback);
    return () => socket.off('card_scanned', callback);
  },

  emitCardScanned: (data) => {
    const socket = getSocket();
    socket.emit('card_scanned', data);
  },

  // Pending customer events
  onPendingCustomerCreated: (callback) => {
    const socket = getSocket();
    socket.on('pending_customer_created', callback);
    return () => socket.off('pending_customer_created', callback);
  },
  onPendingCustomerUpdated: (callback) => {
    const socket = getSocket();
    socket.on('pending_customer_updated', callback);
    return () => socket.off('pending_customer_updated', callback);
  },
  onPendingCustomerDeleted: (callback) => {
    const socket = getSocket();
    socket.on('pending_customer_deleted', callback);
    return () => socket.off('pending_customer_deleted', callback);
  },
  onPendingCustomerApproved: (callback) => {
    const socket = getSocket();
    socket.on('pending_customer_approved', callback);
    return () => socket.off('pending_customer_approved', callback);
  },
  onPendingCustomerRejected: (callback) => {
    const socket = getSocket();
    socket.on('pending_customer_rejected', callback);
    return () => socket.off('pending_customer_rejected', callback);
  },

  // Check-in events
  onCheckInCreated: (callback) => {
    const socket = getSocket();
    socket.on('check_in_created', callback);
    return () => socket.off('check_in_created', callback);
  },
  onCheckInUpdated: (callback) => {
    const socket = getSocket();
    socket.on('check_in_updated', callback);
    return () => socket.off('check_in_updated', callback);
  },
  onCheckInRepeatRequest: (callback) => {
    const socket = getSocket();
    socket.on('check_in_repeat_request', callback);
    return () => socket.off('check_in_repeat_request', callback);
  },

  // ✅ Resepsionun qərarını serverə göndər
  emitCheckInRepeatDecision: ({ checkInId, approved }) => {
    const socket = getSocket();
    // serverdə socket.on("reception_check_in_decision", ...) bunu tutacaq
    socket.emit('reception_check_in_decision', { checkInId, approved });
  },

  // (opsional) serverdən gələn resolved event
  onCheckInRepeatResolved: (callback) => {
    const socket = getSocket();
    socket.on('check_in_repeat_resolved', callback);
    return () => socket.off('check_in_repeat_resolved', callback);
  },

  // Turniket events
  onTurniketOpen: (callback) => {
    const socket = getSocket();
    socket.on('turniket_open', callback);
    return () => socket.off('turniket_open', callback);
  },
  emitTurniketOpen: (data) => {
    const socket = getSocket();
    socket.emit('turniket_open', data);
  },
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  socketEvents,
};
