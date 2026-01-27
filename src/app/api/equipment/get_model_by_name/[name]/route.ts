import { NextRequest, NextResponse } from 'next/server'
import { EquipmentService } from '@/services/equipmentService'

const equipmentService = new EquipmentService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const eqModels = await equipmentService.getEquipmentModelByName(name)
    return NextResponse.json(eqModels)
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