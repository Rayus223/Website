import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { message } from 'antd';

const NotificationContext = createContext();

const MAX_NOTIFICATIONS = 10; // Keep only the latest 10 notifications
const NOTIFICATION_SOUND_URL = '/notification.mp3'; // Path to your sound file

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState(() => {
        // Load initial notifications from localStorage
        try {
            const saved = localStorage.getItem('adminNotifications');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Failed to load notifications from localStorage", error);
            return [];
        }
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const [wsInstance, setWsInstance] = useState(null);

    // Function to play notification sound
    const playNotificationSound = useCallback(() => {
        try {
            const audio = new Audio(NOTIFICATION_SOUND_URL);
            audio.play().catch(e => console.error("Error playing sound:", e)); // Catch play errors
        } catch (error) {
            console.error("Failed to play notification sound", error);
        }
    }, []);

    // Function to add a new notification
    const addNotification = useCallback((notification) => {
        setNotifications(prev => {
            const newNotifications = [
                { ...notification, id: Date.now(), read: false, timestamp: new Date().toISOString() },
                ...prev
            ].slice(0, MAX_NOTIFICATIONS); // Keep only the last N notifications
            
            // Save to localStorage
            localStorage.setItem('adminNotifications', JSON.stringify(newNotifications));
            return newNotifications;
        });
        setUnreadCount(prev => prev + 1);
        playNotificationSound();
    }, [playNotificationSound]);

    // Function to mark notifications as read
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }));
            localStorage.setItem('adminNotifications', JSON.stringify(updated));
            return updated;
        });
        setUnreadCount(0);
    }, []);

    // WebSocket Connection Logic
    useEffect(() => {
        let ws = null; // Use a local variable for the instance in this effect scope
        let reconnectTimeoutId = null;

        const connectWebSocket = () => {
            // Prevent multiple connections if one is already active or pending
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                console.log('WebSocket already connected or connecting.');
                return;
            }

            console.log('Attempting WebSocket connection...');
            ws = new WebSocket('wss://api.dearsirhometuition.com'); // Your WebSocket URL

            ws.onopen = () => {
                console.log('WebSocket Connected (NotificationContext)');
                setWsInstance(ws); // Update state if needed elsewhere, but manage listeners locally
                // Clear any pending reconnect timeout
                if (reconnectTimeoutId) {
                    clearTimeout(reconnectTimeoutId);
                    reconnectTimeoutId = null;
                }
            };

            ws.onmessage = (event) => {
                // Make sure ws instance is valid before processing
                if (!ws || ws.readyState !== WebSocket.OPEN) return; 
                try {
                    const receivedMessage = JSON.parse(event.data);
                    console.log('[NotificationContext] WebSocket Message Received:', receivedMessage); // Add context identifier

                    if (receivedMessage.type === 'NEW_APPLICATION') {
                        const { teacherName, vacancyTitle } = receivedMessage.data;
                        addNotification({
                            type: 'NEW_APPLICATION',
                            title: 'New Application',
                            description: `${teacherName || 'A teacher'} applied for "${vacancyTitle || 'a vacancy'}"`,
                        });
                    } else if (receivedMessage.type === 'STATUS_UPDATE') {
                        // Handle other types if needed
                    } else {
                        console.log('Unknown WebSocket message type:', receivedMessage.type);
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                // Don't automatically reconnect on error, wait for close
            };

            ws.onclose = () => {
                console.log('WebSocket Disconnected.');
                setWsInstance(null); // Update state
                ws = null; // Nullify local instance
                
                // Clear previous timeout if exists and schedule reconnect
                if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
                console.log('Attempting reconnect in 5 seconds...');
                reconnectTimeoutId = setTimeout(connectWebSocket, 5000); 
            };
        };

        connectWebSocket();

        // Enhanced Cleanup function
        return () => {
            console.log('Cleaning up WebSocket effect...');
            // Clear reconnect timeout if component unmounts
            if (reconnectTimeoutId) {
                clearTimeout(reconnectTimeoutId);
                reconnectTimeoutId = null;
                console.log('Cleared reconnect timeout.');
            }
            // Remove listeners and close connection if it exists
            if (ws) {
                console.log('Removing WebSocket listeners and closing connection.');
                // Remove listeners explicitly to prevent memory leaks
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null; 
                // Close the connection only if it's open or connecting
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
                ws = null; // Nullify local instance
                setWsInstance(null); // Ensure state is also nullified
            }
        };
    }, []); // Keep dependency array empty

    // Calculate initial unread count
    useEffect(() => {
        setUnreadCount(notifications.filter(n => !n.read).length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext); 