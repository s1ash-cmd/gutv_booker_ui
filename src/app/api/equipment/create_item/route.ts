import { UserRole } from '@/app/models/user/user'
import { getUserFromToken, requireRole } from '@/lib/authUtils'
import { EquipmentService } from '@/services/equipmentService'
import { NextRequest, NextResponse } from 'next/server'

const equipmentService = new EquipmentService()

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    requireRole(user.role, UserRole.Admin)

    const { searchParams } = new URL(request.url)
    const equipmentModelId = parseInt(searchParams.get('equipmentModelId') || '0', 10)

    if (!equipmentModelId) {
      return NextResponse.json(
        { error: 'Необходимо указать equipmentModelId' },
        { status: 400 }
      )
    }

    const item = await equipmentService.createEquipmentItem(equipmentModelId)
    return NextResponse.json(item)
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