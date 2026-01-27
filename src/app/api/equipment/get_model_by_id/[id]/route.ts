import { NextRequest, NextResponse } from 'next/server'
import { EquipmentService } from '@/services/equipmentService'

const equipmentService = new EquipmentService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam, 10)
    const eqModel = await equipmentService.getEquipmentModelById(id)
    return NextResponse.json(eqModel)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('не найден')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}