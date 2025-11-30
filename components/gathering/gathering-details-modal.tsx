'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GatheringWithDetails } from '@/lib/supabase/types'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { CheckIcon, CopyIcon, XIcon, UserPlusIcon } from 'lucide-react'

interface GatheringDetailsModalProps {
  gathering: GatheringWithDetails
  currentUserId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GatheringDetailsModal({
  gathering,
  currentUserId,
  open,
  onOpenChange,
}: GatheringDetailsModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [friendNickname, setFriendNickname] = useState('')
  const [showBookForFriend, setShowBookForFriend] = useState(false)
  const [selectedSlotForFriend, setSelectedSlotForFriend] = useState<number | null>(null)

  const date = new Date(gathering.gathering_date)
  const isFull = (gathering.slots_count || 0) >= gathering.max_slots
  const userSlot = gathering.slots?.find((s: any) => s.user_id === currentUserId)
  const userHasSlot = !!userSlot
  const userInWaitlist = gathering.waitlist?.some((w: any) => w.user_id === currentUserId) || false
  const isCreator = currentUserId === gathering.creator_id
  const isOpen = gathering.status === 'open'

  const handleCopyLink = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('gathering', gathering.id)
    navigator.clipboard.writeText(url.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBook = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gathering.id}/book`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка бронирования')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('Ошибка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnbook = async () => {
    if (!window.confirm('Вы уверены что хотите освободить место?')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gathering.id}/book`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка отмены бронирования')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('Ошибка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinWaitlist = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gathering.id}/waitlist`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка добавления в очередь')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('Ошибка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveWaitlist = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gathering.id}/waitlist`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка выхода из очереди')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('Ошибка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookForFriend = async (slotNumber?: number) => {
    if (!friendNickname.trim() || friendNickname.trim().length < 2) {
      setError('Никнейм должен быть минимум 2 символа')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gathering.id}/book-for-friend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          friendNickname: friendNickname.trim(),
          slotNumber: slotNumber || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка бронирования для друга')
      } else {
        setShowBookForFriend(false)
        setSelectedSlotForFriend(null)
        setFriendNickname('')
        router.refresh()
      }
    } catch (err) {
      setError('Ошибка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGathering = async () => {
    if (!window.confirm('Вы уверены? Это действие нельзя отменить.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gathering.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка удаления')
      } else {
        onOpenChange(false)
        router.refresh()
      }
    } catch (err) {
      setError('Ошибка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const allSlots = Array.from({ length: gathering.max_slots }, (_, i) => {
    const slotNumber = i + 1
    const slot = gathering.slots?.find((s: any) => s.slot_number === slotNumber)
    return { slotNumber, slot }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{gathering.title}</DialogTitle>
              <DialogDescription className="mt-2">
                Создал {gathering.creator?.display_name}
                {gathering.creator?.telegram_username &&
                  ` (@${gathering.creator.telegram_username})`}
              </DialogDescription>
            </div>
            <Badge variant={isFull ? 'secondary' : 'default'} className="text-lg px-3 py-1">
              {gathering.slots_count}/{gathering.max_slots}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Info */}
          <Card className="p-4 space-y-3">
          

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <h3 className="font-medium mb-1">Дата и время</h3>
                <p className="text-muted-foreground">
                  {format(date, 'd MMMM yyyy, HH:mm', { locale: uk })}
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-1">Статус</h3>
                <Badge variant={isOpen ? 'default' : 'secondary'} className="text-xs">
                  {isOpen ? 'Открытый' : gathering.status === 'closed' ? 'Закрытый' : 'Отмененный'}
                </Badge>
              </div>
            </div>

            {gathering.booking_deadline && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-1 text-sm">Дедлайн бронирования</h3>
                  <p className="text-muted-foreground text-xs">
                    {format(new Date(gathering.booking_deadline), 'd MMMM yyyy, HH:mm', { locale: uk })}
                  </p>
                </div>
              </>
            )}
          </Card>

          {/* Actions */}
          {isOpen && currentUserId && (
            <div className="space-y-2">
              {userHasSlot ? (
                <Button
                  onClick={handleUnbook}
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full"
                >
                  {isLoading ? 'Отмена...' : 'Освободить место'}
                </Button>
              ) : isFull ? (
                userInWaitlist ? (
                  <Button
                    onClick={handleLeaveWaitlist}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoading ? 'Выход...' : 'Выйти из очереди'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleJoinWaitlist}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    {isLoading ? 'Добавление...' : 'Встать в очередь'}
                  </Button>
                )
              ) : (
                <>
                  <Button onClick={handleBook} disabled={isLoading} className="w-full">
                    {isLoading ? 'Бронирование...' : 'Занять место'}
                  </Button>
                  {!showBookForFriend && !selectedSlotForFriend && (
                    <Button
                      onClick={() => setShowBookForFriend(true)}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <UserPlusIcon className="w-4 h-4 mr-2" />
                      Забронировать для друга
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Book for friend form */}
          {showBookForFriend && isOpen && !isFull && (
            <Card className="p-4 space-y-3 border-blue-200 bg-blue-50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">
                  Забронировать для друга
                  {selectedSlotForFriend && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Слот #{selectedSlotForFriend})
                    </span>
                  )}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowBookForFriend(false)
                    setSelectedSlotForFriend(null)
                    setFriendNickname('')
                    setError(null)
                  }}
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="friend-nickname" className="text-xs">
                  Никнейм друга
                </Label>
                <Input
                  id="friend-nickname"
                  placeholder="Введите никнейм"
                  value={friendNickname}
                  onChange={(e) => setFriendNickname(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBookForFriend(selectedSlotForFriend || undefined)
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => handleBookForFriend(selectedSlotForFriend || undefined)}
                disabled={isLoading || friendNickname.trim().length < 2}
                className="w-full"
                size="sm"
              >
                {isLoading ? 'Бронирование...' : 'Забронировать'}
              </Button>
            </Card>
          )}

          {/* Participants */}
          <Card className="p-4">
            <h3 className="font-medium mb-3 text-sm">
              Участники ({gathering.slots_count}/{gathering.max_slots})
            </h3>
            <div className="space-y-2">
              {allSlots.map(({ slotNumber, slot }) => (
                <div
                  key={slotNumber}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    slot
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant={slot ? 'default' : 'outline'} className="text-xs">
                      #{slotNumber}
                    </Badge>
                    {slot ? (
                      <div>
                        <div className="text-sm font-medium">
                          {slot.user?.display_name || 'Неизвестный'}
                        </div>
                        {slot.user?.telegram_username && (
                          <div className="text-xs text-muted-foreground">
                            @{slot.user.telegram_username}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Свободное место</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!slot && isOpen && currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setSelectedSlotForFriend(slotNumber)
                          setShowBookForFriend(true)
                        }}
                        disabled={isLoading}
                      >
                        <UserPlusIcon className="w-3 h-3 mr-1" />
                        Для друга
                      </Button>
                    )}
                    {slot && slot.user_id === currentUserId && isOpen && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                        onClick={handleUnbook}
                        disabled={isLoading}
                      >
                        × Освободить
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Waitlist */}
          {gathering.waitlist && gathering.waitlist.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-3 text-sm">
                Очередь ожидания ({gathering.waitlist.length})
              </h3>
              <div className="space-y-2">
                {gathering.waitlist.map((w: any, index: number) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200"
                  >
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div className="text-sm">
                      {w.user?.display_name || 'Неизвестный'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Share & Delete */}
          <div className="flex gap-2">
            <Button onClick={handleCopyLink} variant="outline" className="flex-1" size="sm">
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" /> Скопировано!
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4 mr-2" /> Копировать ссылку
                </>
              )}
            </Button>
            {isCreator && (
              <Button
                onClick={handleDeleteGathering}
                variant="destructive"
                size="sm"
                disabled={isLoading}
              >
                Удалить сбор
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

