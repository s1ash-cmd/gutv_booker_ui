import { EquipmentService } from '@/services/equipmentService'
import { NextRequest, NextResponse } from 'next/server'

const equipmentService = new EquipmentService()

export async function GET(request: NextRequest) {
  try {
    const items = await equipmentService.getAllEquipmentItems()
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}