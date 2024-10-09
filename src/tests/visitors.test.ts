// NOTE:
// ALL THE BENCHMARK TESTS ARE MADE ON THE ASSUMPTION THAT BOTH THE WRITE AND READ TESTS PASSED.
// Make sure that all the write and read tests pass before trying these ones.

import { BinaryPacket } from '..'
import assert from 'assert/strict'

function testVisitors() {
  const PacketA = BinaryPacket.define(1)
  const PacketB = BinaryPacket.define(2)
  const PacketC = BinaryPacket.define(3)

  const unknownPacket = PacketB.writeNodeBuffer({})

  BinaryPacket.visitNodeBuffer(
    unknownPacket,
    PacketA.visitor(_ => assert(false, 'Erroneously accepted PacketA visitor')),
    PacketB.visitor(() => {}),
    PacketC.visitor(_ => assert(false, 'Erroneously accepted PacketC visitor'))
  )

  console.log('[VISITORS]: PASS')
}

testVisitors()
