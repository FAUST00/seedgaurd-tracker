'use client';

/**
 * Social page — three sub-tabs:
 *   Friends   → search, send requests, manage accepted friends
 *   Requests  → incoming / outgoing with accept / cancel
 *   Messages  → DM panel with any accepted friend
 *
 * Background art: wireframe-sun.jpg placed as header banner (see ImageBanner).
 * Realtime: friend-request changes + new DMs both trigger live updates.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, MessageSquare, UserPlus, UserCheck, UserX, Search,
  Send, ChevronRight, Bell, Loader2, Ghost, Check, X,
} from 'lucide-react';
import { ImageBanner } from '@/components/synth-background';
import { FriendRowSkeleton, MessagesSkeleton } from '@/components/skeleton';
import { ProfileCard } from '@/components/profile-card';
import { useToast } from '@/components/toast';
import { getUser } from '@/lib/sync';
import { syncProfileStreak } from '@/lib/social';
import {
  searchUsers, sendFriendRequest, acceptFriendRequest,
  removeFriendship, getMyFriendships, getConversation,
  sendMessage, subscribeToConversation, subscribeToFriendRequests,
  getUnreadCount,
  type FriendRequest, type DirectMessage, type PublicProfile,
} from '@/lib/social';
import { ART } from '@/lib/assets';

type Tab = 'friends' | 'requests' | 'messages';

// ── Avatar helper ──────────────────────────────────────────────────────────────
function Avatar({
  username,
  avatarUrl,
  size = 'md',
}: {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${dim} rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-bold text-primary flex-shrink-0`}
      aria-hidden
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" loading="lazy" />
      ) : (
        username.charAt(0).toUpperCase()
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SocialPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('friends');
  const [loading, setLoading] = useState(true);

  // Friends state
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Messages state
  const [activeFriend, setActiveFriend] = useState<FriendRequest | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubMsgs = useRef<(() => void) | null>(null);
  const unsubReqs = useRef<(() => void) | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  const loadFriendships = useCallback(async () => {
    try {
      const { accepted, incoming: inc, outgoing: out } = await getMyFriendships();
      setFriends(accepted);
      setIncoming(inc);
      setOutgoing(out);
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err: unknown) {
      toast((err as Error).message ?? 'Failed to load friends.', 'error');
    }
  }, [toast]);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      await syncProfileStreak();
      await loadFriendships();
      setLoading(false);

      // Realtime: incoming friend requests
      unsubReqs.current = subscribeToFriendRequests(user.id, loadFriendships);
    }
    init();
    return () => {
      unsubReqs.current?.();
      unsubMsgs.current?.();
    };
  }, [loadFriendships]);

  // ── Search with debounce ──────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
      } catch (err: unknown) {
        toast((err as Error).message, 'error');
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, toast]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleSendRequest(profile: PublicProfile) {
    try {
      await sendFriendRequest(profile.id);
      setSearchQuery('');
      setSearchResults([]);
      await loadFriendships();
      toast(`Friend request sent to ${profile.username}!`, 'success');
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
  }

  async function handleAccept(req: FriendRequest) {
    try {
      await acceptFriendRequest(req.id);
      await loadFriendships();
      toast(`${req.profile.username} accepted! You are now friends 🎉`, 'success');
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
  }

  async function handleRemove(req: FriendRequest) {
    if (!confirm(`Remove ${req.profile.username}?`)) return;
    try {
      await removeFriendship(req.id);
      await loadFriendships();
      if (activeFriend?.id === req.id) setActiveFriend(null);
      toast('Removed.', 'info');
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
  }

  // ── Messages ─────────────────────────────────────────────────────────────
  async function openConversation(friend: FriendRequest) {
    setActiveFriend(friend);
    setTab('messages');
    setMsgLoading(true);
    unsubMsgs.current?.();
    try {
      const msgs = await getConversation(friend.profile.id);
      setMessages(msgs);
      if (userId) {
        unsubMsgs.current = subscribeToConversation(userId, friend.profile.id, (newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
        });
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setMsgLoading(false);
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!activeFriend || !msgInput.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeFriend.profile.id, msgInput);
      setMessages((prev) => [...prev, msg]);
      setMsgInput('');
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setSending(false);
    }
  }

  // ── Loading / no-auth guards ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-4 page-entry">
        {[1, 2, 3].map((i) => <FriendRowSkeleton key={i} />)}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-8 text-center page-entry">
        <Users className="w-12 h-12 text-primary" aria-hidden />
        <h2 className="text-2xl font-bold neon-text-pink text-primary uppercase tracking-wider">
          Sign in to use Social
        </h2>
        <p className="text-muted-foreground max-w-sm">
          Create a free account to search for friends, send messages, and join the community.
        </p>
        <a
          href="/account"
          className="px-6 py-3 rounded-xl border border-primary/50 bg-primary/10 text-primary font-bold uppercase tracking-wider neon-hover"
        >
          Go to Account
        </a>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-6 page-entry">
      {/* Header banner — wireframe-sun.jpg placed here */}
      <ImageBanner src={ART.wireframeSun} className="mb-2">
        <div className="p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-widest uppercase italic neon-text-pink text-primary flex items-center gap-3">
            <Users className="w-8 h-8" aria-hidden />
            Social
          </h1>
          <p className="text-muted-foreground text-base mt-1">
            Find friends, send requests, and chat in real-time.
          </p>
        </div>
      </ImageBanner>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Social sections">
        {([
          { id: 'friends',  label: 'Friends',  icon: UserCheck, badge: friends.length },
          { id: 'requests', label: 'Requests', icon: Bell,      badge: incoming.length },
          { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount },
        ] as { id: Tab; label: string; icon: typeof Bell; badge: number }[]).map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm transition-all
              ${tab === id
                ? 'bg-primary/20 text-primary border border-primary/50 neon-box-pink'
                : 'border border-muted/30 text-muted-foreground hover:text-foreground hover:border-muted/60'}
            `}
          >
            <Icon className="w-4 h-4" aria-hidden />
            {label}
            {badge > 0 && (
              <span className="ml-1 min-w-[1.2rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Friends Tab ────────────────────────────────────────────────────── */}
      {tab === 'friends' && (
        <div className="space-y-6 animate-fade-in" role="tabpanel" aria-label="Friends">
          {/* Search */}
          <div className="rounded-2xl border border-secondary/20 glass-effect p-6 space-y-4">
            <h2 className="text-base font-bold uppercase tracking-wider text-secondary neon-text-cyan flex items-center gap-2">
              <UserPlus className="w-4 h-4" aria-hidden /> Add a Friend
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" aria-label="Searching" />
              )}
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username…"
                aria-label="Search users by username"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-muted/30 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 text-sm"
              />
            </div>

            {searchResults.length > 0 && (
              <ul className="space-y-2" aria-label="Search results">
                {searchResults.map((profile) => {
                  const alreadyFriend = friends.some((f) => f.profile.id === profile.id);
                  const pendingOut = outgoing.some((f) => f.profile.id === profile.id);
                  return (
                    <li
                      key={profile.id}
                      className="rounded-xl border border-muted/20 glass-effect p-3 flex items-center gap-3"
                    >
                      <Avatar username={profile.username ?? '?'} avatarUrl={profile.avatar_url} />
                      <span className="flex-1 font-medium truncate text-sm">{profile.username}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{profile.current_streak}d</span>
                      {alreadyFriend ? (
                        <span className="text-xs text-secondary flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Friends</span>
                      ) : pendingOut ? (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(profile)}
                          aria-label={`Send friend request to ${profile.username}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-bold hover:bg-primary/15 transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5" aria-hidden /> Add
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No users found for &ldquo;{searchQuery}&rdquo;</p>
            )}
          </div>

          {/* Friend list */}
          <div className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-primary neon-text-pink flex items-center gap-2">
              <UserCheck className="w-4 h-4" aria-hidden /> Your Friends ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-muted/30 p-10 text-center text-muted-foreground">
                <Ghost className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden />
                <p className="text-sm">No friends yet. Search above to get started.</p>
              </div>
            ) : (
              <ul className="space-y-3" aria-label="Friends list">
                {friends.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-2xl border border-muted/20 glass-effect p-4 flex items-center gap-3 neon-hover"
                  >
                    <ProfileCard
                      entry={{
                        id: f.profile.id,
                        username: f.profile.username ?? '?',
                        avatar_url: f.profile.avatar_url,
                        current_streak: f.profile.current_streak,
                        best_streak: f.profile.best_streak,
                        streak_start: f.profile.streak_start,
                        last_active: f.profile.last_active,
                        isMe: false,
                      }}
                    >
                      <Avatar username={f.profile.username ?? '?'} avatarUrl={f.profile.avatar_url} />
                    </ProfileCard>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{f.profile.username}</p>
                      <p className="text-xs text-muted-foreground">{f.profile.current_streak} day streak</p>
                    </div>
                    <button
                      onClick={() => openConversation(f)}
                      aria-label={`Message ${f.profile.username}`}
                      className="p-2 rounded-lg text-secondary border border-secondary/30 hover:bg-secondary/15 transition-all"
                    >
                      <MessageSquare className="w-4 h-4" aria-hidden />
                    </button>
                    <button
                      onClick={() => handleRemove(f)}
                      aria-label={`Remove ${f.profile.username}`}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <UserX className="w-4 h-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Requests Tab ───────────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-6 animate-fade-in" role="tabpanel" aria-label="Friend requests">
          {/* Incoming */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-gold neon-text-gold flex items-center gap-2">
              <Bell className="w-4 h-4" aria-hidden />
              Incoming ({incoming.length})
            </h2>
            {incoming.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No pending requests.</p>
            ) : (
              <ul className="space-y-3">
                {incoming.map((req) => (
                  <li key={req.id} className="rounded-2xl border border-gold/20 glass-effect p-4 flex items-center gap-3">
                    <Avatar username={req.profile.username ?? '?'} avatarUrl={req.profile.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{req.profile.username}</p>
                      <p className="text-xs text-muted-foreground">{req.profile.current_streak} day streak</p>
                    </div>
                    <button
                      onClick={() => handleAccept(req)}
                      aria-label={`Accept ${req.profile.username}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-secondary/50 text-secondary text-xs font-bold hover:bg-secondary/15 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden /> Accept
                    </button>
                    <button
                      onClick={() => handleRemove(req)}
                      aria-label={`Decline ${req.profile.username}`}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <X className="w-4 h-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Outgoing */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ChevronRight className="w-4 h-4" aria-hidden />
              Sent ({outgoing.length})
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No outgoing requests.</p>
            ) : (
              <ul className="space-y-3">
                {outgoing.map((req) => (
                  <li key={req.id} className="rounded-2xl border border-muted/20 glass-effect p-4 flex items-center gap-3">
                    <Avatar username={req.profile.username ?? '?'} avatarUrl={req.profile.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{req.profile.username}</p>
                      <p className="text-xs text-muted-foreground">Waiting for response…</p>
                    </div>
                    <button
                      onClick={() => handleRemove(req)}
                      aria-label={`Cancel request to ${req.profile.username}`}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Messages Tab ───────────────────────────────────────────────────── */}
      {tab === 'messages' && (
        <div className="animate-fade-in" role="tabpanel" aria-label="Messages">
          {!activeFriend ? (
            /* Conversation list */
            <div className="space-y-3">
              <h2 className="text-base font-bold uppercase tracking-wider text-secondary neon-text-cyan flex items-center gap-2">
                <MessageSquare className="w-4 h-4" aria-hidden /> Conversations
              </h2>
              {friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-muted/30 p-10 text-center text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden />
                  <p className="text-sm">Add friends first to start chatting.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {friends.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => openConversation(f)}
                        className="w-full rounded-2xl border border-muted/20 glass-effect p-4 flex items-center gap-3 text-left neon-hover"
                        aria-label={`Open conversation with ${f.profile.username}`}
                      >
                        <Avatar username={f.profile.username ?? '?'} avatarUrl={f.profile.avatar_url} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{f.profile.username}</p>
                          <p className="text-xs text-muted-foreground">Tap to open</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            /* Active conversation */
            <div className="flex flex-col rounded-2xl border border-secondary/20 glass-effect overflow-hidden" style={{ height: '70vh' }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-secondary/15 bg-background/30">
                <button
                  onClick={() => setActiveFriend(null)}
                  aria-label="Back to conversations"
                  className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
                <Avatar username={activeFriend.profile.username ?? '?'} avatarUrl={activeFriend.profile.avatar_url} size="sm" />
                <span className="font-bold text-sm">{activeFriend.profile.username}</span>
              </div>

              {/* Message list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite" aria-label="Messages">
                {msgLoading ? (
                  <MessagesSkeleton />
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    No messages yet. Say hi!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender === userId;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`
                            max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                            ${isMe
                              ? 'bg-primary/25 border border-primary/30 text-foreground rounded-br-sm'
                              : 'bg-muted/40 border border-muted/30 rounded-bl-sm'}
                          `}
                        >
                          <p>{msg.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 text-right">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 px-4 py-3 border-t border-secondary/15 bg-background/30">
                <input
                  type="text"
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={`Message ${activeFriend.profile.username}…`}
                  aria-label="Write a message"
                  maxLength={1000}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-muted/30 bg-background/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !msgInput.trim()}
                  aria-label="Send message"
                  className="p-2.5 rounded-xl bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 disabled:opacity-40 transition-all"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
