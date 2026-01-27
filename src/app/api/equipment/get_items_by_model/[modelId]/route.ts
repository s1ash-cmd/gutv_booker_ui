import { EquipmentService } from '@/services/equipmentService'
import { NextRequest, NextResponse } from 'next/server'

const equipmentService = new EquipmentService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const { modelId: modelIdParam } = await params
    const modelId = parseInt(modelIdParam, 10)

    const items = await equipmentService.getEquipmentItemsByModel(modelId)
    return NextResponse.json(items)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('не найден')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}