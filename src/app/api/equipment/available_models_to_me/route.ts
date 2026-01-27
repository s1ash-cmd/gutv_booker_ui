import { getUserFromToken } from '@/lib/authUtils'
import { EquipmentService } from '@/services/equipmentService'
import { NextRequest, NextResponse } from 'next/server'

const equipmentService = new EquipmentService()

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    const eqModels = await equipmentService.getAvailableToMe(user.id)
    return NextResponse.json(eqModels)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message.includes('не найден')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}