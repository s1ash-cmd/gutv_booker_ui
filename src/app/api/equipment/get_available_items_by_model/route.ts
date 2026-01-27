import { EquipmentService } from '@/services/equipmentService'
import { NextRequest, NextResponse } from 'next/server'

const equipmentService = new EquipmentService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = parseInt(searchParams.get('modelId') || '0', 10)
    const start = new Date(searchParams.get('start') || '')
    const end = new Date(searchParams.get('end') || '')

    if (!modelId || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Необходимо указать modelId, start и end' },
        { status: 400 }
      )
    }

    const items = await equipmentService.getAvailableEquipmentItemsByModel(modelId, start, end)
    return NextResponse.json(items)
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