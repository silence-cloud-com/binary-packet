# @silencecloud/binary-packet

Lightweight and hyper-fast, zero-dependencies, TypeScript-first, schema-based binary packets serialization and deserialization library. \
Originally made to be used for an ultrafast WebSockets communication with user-defined type-safe messages between client and server, with the smallest bytes usage possible.

Supports serializing into and deserializing from [**DataView**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)s, [**ArrayBuffer**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)s and [**Buffer**](https://nodejs.org/api/buffer.html#buffer)s (NodeJS/Bun only). \
To achieve the maximum performance is it always advised to use node Buffer(s) when available.

## Installation

Node: \
`npm install @silencecloud/binary-packet`

Bun: \
`bun add @silencecloud/binary-packet`

## Features & Specification

Define the structure of the packets through unique Packet IDs and "schema" objects. \
This "schema" object is simply called `Definition` and defines the shape of a packet: specifically its `fields` and their `types`.

Currently, these kinds of `fields` are supported:
| Type | Description | Values | Size (bytes) |
|------|-------------|--------------|--------------|
| `Field.UNSIGNED_INT_8` | 8 bits unsigned integer | 0 - 255 | 1 |
| `Field.UNSIGNED_INT_16` | 16 bits unsigned integer | 0 - 65535 | 2 |
| `Field.UNSIGNED_INT_32` | 32 bits unsigned integer | 0 - 4294967295 | 4 |
| `Field.INT_8` | 8 bits signed integer | -128 - 127 | 1 |
| `Field.INT_16` | 16 bits signed integer | -32768 - 32767 | 2 |
| `Field.INT_32` | 32 bits signed integer | -2147483648 - 2147483647 | 4 |
| `Field.FLOAT_32` | 32 bits IEEE754 floating-point | | 4 |
| `Field.FLOAT_64` | 64 bits IEEE754 floating-point | | 8 |
| `BinaryPacket` | BinaryPacket "subpacket" | BinaryPacket | size(BinaryPacket) |
| `FieldArray` | Array of one of the types above | Up to 256 elements | 1 + length \* size(Field) |

## Usage Examples

```typescript
import { BinaryPacket, Field, FieldArray } from '@silencecloud/binary-packet'

// Imagine we have a game board where each cell is a square and is one unit big.
// A cell can be then defined by its X and Y coordinates.
// For simplicity, let's say there cannot be more than 256 cells, so we can use 8 bits for each coordinate.
const Cell = {
  x: Field.UNSIGNED_INT_8,
  y: Field.UNSIGNED_INT_8
}

// When done with the cell definition we can create its BinaryPacket writer/reader.
// NOTE: each BinaryPacket needs an unique ID, for identification purposes and error checking.
const CellPacket = BinaryPacket.define(0, Cell)

// Let's now make the definition of the whole game board.
// You can also specify arrays of both "primitive" fields and other BinaryPackets.
const Board = {
  numPlayers: Field.UNSIGNED_INT_8,
  otherStuff: Field.INT_32,
  cells: FieldArray(CellPacket) // equivalent to { cells: [CellPacket] }
}

// When done with the board definition we can create its BinaryPacket writer/reader.
// NOTE: each BinaryPacket needs an unique ID, for identification purposes and error checking.
const BoardPacket = BinaryPacket.define(1, Board)

//////////////////
// WRITING SIDE //
//////////////////
const buffer = BoardPacket.writeNodeBuffer({
  numPlayers: 1,
  otherStuff: 69420,
  cells: [
    { x: 0, y: 0 },
    { x: 1, y: 1 }
  ]
})

// ...
// sendTheBufferOverTheNetwork(buffer)
// ...

//////////////////
// READING SIDE //
//////////////////
import assert from 'assert'

// ...
// const buffer = receiveTheBufferFromTheNetwork()
// ...

const board = BoardPacket.readNodeBuffer(buffer)

assert(board.numPlayers === 1)
assert(board.otherStuff === 69420)
assert(board.cells.length === 2)
assert(board.cells[0].x === 0)
assert(board.cells[0].y === 0)
assert(board.cells[1].x === 1)
assert(board.cells[1].y === 1)
```
