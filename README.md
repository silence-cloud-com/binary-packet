# binary-packet

Lightweight and hyper-fast, zero-dependencies, TypeScript-first, schema-based binary packets serialization and deserialization library. \
Originally made to be used for an ultrafast WebSockets communication with user-defined type-safe messages between client and server, with the smallest bytes usage possible.

Supports serializing into and deserializing from [**DataView**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)s, [**ArrayBuffer**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)s and [**Buffer**](https://nodejs.org/api/buffer.html#buffer)s (NodeJS/Bun only). \
To achieve the maximum performance is it always advised to use node Buffer(s) when available.

## Installation

Node: \
`npm install binary-packet`

Bun: \
`bun add binary-packet`

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
| `FieldArray` | Dynamically-sized array of one of the types above | Up to 256 elements | 1 + length \* size(Element) |
| `FieldFixedArray` | Statically-sized array of one of the types above | Any pre-defined numbers of elements | length \* size(Element) |

As you can see from the table above, both arrays and nested objects ("subpackets") are supported. \
Note that `FieldFixedArray`s are much more memory efficient and performant than `FieldArray`s, but require a pre-defined length.

## Usage Examples

```typescript
import { BinaryPacket, Field, FieldArray } from 'binary-packet'

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
  cells: FieldArray(CellPacket)
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

## Benchmarks & Alternatives

Benchmarks are not always meant to be taken seriously. \
Most of the times the results of a benchmark do not actually show the full capabilities of each library. \
So, take these "performance" comparisons with a grain of salt; or, even better, do your own benchmarks with the actual data you need to serialize/deserialize.

This library has been benchmarked against the following alternatives:

- [msgpackr](https://www.npmjs.com/package/msgpackr) - A very popular, fast and battle-tested library. Currently offers **many** more features than binary-packet, but it appears to be 2x-4x slower in writes and 3x-10x slower in reads (depends on the packet structure) - is also less type-safe.
- [restructure](https://www.npmjs.com/package/restructure) - An older, popular schema-based library, has some extra features like LazyArrays, but it is **much slower** than both binary-packet and msgpackr. And, sadly, easily crashes with complex structures.

The benchmarks are executed on three different kinds of packets:

- EmptyPacket: basically an empty javascript object.
- SimplePacket: objects with just primitive fields and statically-sized arrays.
- ComplexPacket: objects with primitives, statically-sized arrays, dynamically-sized arrays and other nested objects/arrays.

You can see and run the benchmarks yourself if you clone the repository and launch `npm run benchmark`.

## Disclaimer

This library is still very new, thus not "battle-tested" in production enough, or may still have missing important features. \
If you plan on serializing highly sensitive data or need to guarantee no crashes, use an alternative like [msgpackr](https://www.npmjs.com/package/msgpackr) until this library becomes 100% production-ready.

## Contribute

Would like to have more complex, but still hyper-fast and memory efficient, features? \
[Contribute on GitHub](https://github.com/silence-cloud-com/binary-packet) yourself or, alternatively, [buy me a coffee](https://buymeacoffee.com/silence.cloud)!
