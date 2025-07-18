import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  TextField,
  Button,
  IconButton,
  Badge,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Message as MessageIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { clientPortalAPI } from '../services/api';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'MESSAGE' | 'NOTIFICATION' | 'ALERT';
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientPortalAPI.getMessages();
      setMessages(response.data || []);
    } catch (err: any) {
      setError('Failed to load messages');
      console.error('Messages load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      setError(null);

      await clientPortalAPI.sendMessage({
        content: newMessage,
        type: 'MESSAGE',
        conversationId: selectedConversation,
      });

      setNewMessage('');
      await loadMessages(); // Reload messages
    } catch (err: any) {
      setError('Failed to send message');
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      // Assuming there's a mark as read endpoint
      // await clientPortalAPI.markMessageRead(messageId);
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (err: any) {
      console.error('Mark as read error:', err);
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'ALERT': return 'error';
      case 'NOTIFICATION': return 'warning';
      default: return 'primary';
    }
  };

  const formatTimestamp = (timestamp: string | undefined | null) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <Box p={3} borderBottom={1} borderColor="divider">
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <MessageIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
              <Typography variant="h4" component="h1">
                Messages
              </Typography>
            </Box>
            <IconButton onClick={loadMessages} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        <Box flex={1} display="flex">
          {/* Messages List */}
          <Box width="100%" p={2}>
            {messages.length === 0 ? (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                height="100%"
              >
                <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No messages yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Messages from your security team will appear here
                </Typography>
              </Box>
            ) : (
              <List>
                {messages.map((message, index) => (
                  <React.Fragment key={message.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        backgroundColor: message.read ? 'transparent' : 'action.hover',
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleMarkAsRead(message.id)}
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight={message.read ? 'normal' : 'bold'}>
                              {message.subject || 'No Subject'}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={message.type}
                                size="small"
                                color={getMessageTypeColor(message.type) as any}
                                variant="outlined"
                              />
                              {!message.read && (
                                <Badge color="primary" variant="dot" />
                              )}
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              From: {message.senderName}
                            </Typography>
                            <Typography variant="body2" color="text.primary">
                              {message.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              {formatTimestamp(message.timestamp)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < messages.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </Box>

        {/* Message Input */}
        <Box p={2} borderTop={1} borderColor="divider">
          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
            />
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              sx={{ minWidth: 100 }}
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default MessagesPage;
