import { UserRole } from '@/app/models/user/user'
import { getUserFromToken, requireRole } from '@/lib/authUtils'
import { EquipmentService } from '@/services/equipmentService'
import { NextRequest, NextResponse } from 'next/server'

const equipmentService = new EquipmentService()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    requireRole(user.role, UserRole.Admin)

    const { id: idParam } = await params
    const id = parseInt(idParam, 10)

    await equipmentService.toggleAvailability(id)
    return NextResponse.json({ message: 'Доступность изменена' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message.includes('не найден')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}