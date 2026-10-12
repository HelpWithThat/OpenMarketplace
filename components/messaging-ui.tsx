'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'

export function MessagingUI({ thread, userId }: { thread: any; userId: string }) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(thread.messages)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!message.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/messages/${thread.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })

      if (res.ok) {
        const newMessage = await res.json()
        setMessages((prev: any) => [...prev, newMessage])
        setMessage('')
      }
    } catch (error) {
      console.error('Send message error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container flex max-w-4xl flex-col px-4 py-8" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{thread.job.title}</h1>
        <p className="text-sm text-muted-foreground">Messages</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border p-4">
        {messages.map((msg: any) => {
          const isOwn = msg.senderId === userId
          const senderName = msg.sender.workerProfile?.displayName || msg.sender.buyerProfile?.businessName || msg.sender.name

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <Card className={`max-w-[70%] p-3 ${isOwn ? 'bg-primary text-primary-foreground' : ''}`}>
                <p className="text-xs font-medium mb-1">{senderName}</p>
                <p className="text-sm">{msg.text}</p>
                <p className="mt-1 text-xs opacity-70">
                  {new Date(msg.sentAt).toLocaleString()}
                </p>
              </Card>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          rows={2}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
        />
        <Button onClick={sendMessage} disabled={loading || !message.trim()}>
          Send
        </Button>
      </div>
    </div>
  )
}
