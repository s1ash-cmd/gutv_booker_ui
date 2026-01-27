import { EquipmentService } from '@/services/equipmentService'
import { NextRequest, NextResponse } from 'next/server'

const equipmentService = new EquipmentService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category: categoryParam } = await params
    const category = parseInt(categoryParam, 10)

    const eqModels = await equipmentService.getEquipmentModelByCategory(category)
    return NextResponse.json(eqModels)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('не найден')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}