import { GridSpecification } from './grid';
import { select, Selection, BaseType } from 'd3-selection';
import { Transition } from 'd3-transition';
import { easeLinear } from 'd3-ease';
import 'd3-transition';

enum MoveDirection {
  TopLeft = 0,
  TopRight = 1,
  BottomRight = 2,
  BottomLeft = 3,
}

const getOppositeDirection = (direction: MoveDirection) => {
  switch (direction) {
    case MoveDirection.TopRight:
      return MoveDirection.BottomLeft;
    case MoveDirection.BottomRight:
      return MoveDirection.TopLeft;
    case MoveDirection.BottomLeft:
      return MoveDirection.TopRight;
    case MoveDirection.TopLeft:
      return MoveDirection.BottomRight;
  }
};

type Block = {
  x: number;
  y: number;
  nextMove: { x: number; y: number };
  isMain: boolean;
  startPosition: { x: number; y: number };
  hasMovedSinceSpawn: boolean;
};

const blocks: Block[] = [
  {
    nextMove: { x: 1, y: 1 },
    isMain: true,
    x: 0,
    y: 0,
    startPosition: { x: 0, y: 0 },
    hasMovedSinceSpawn: false,
  },
];

function moveToNewPosition(b: Block) {
  b.hasMovedSinceSpawn = true;
  b.x += b.nextMove.x;
  b.y += b.nextMove.y;
}
function flipYDirection(block: Block) {
  block.nextMove.y *= -1;
  return block;
}
function flipXDirection(block: Block) {
  block.nextMove.x *= -1;
  return block;
}

function spawnNewBlock(block: Block) {
  return {
    ...block,
    isMain: false,
    hasMovedSinceSpawn: false,
    nextMove: { ...block.nextMove },
    startPosition: { x: block.x, y: block.y },
  };
}

const calculateNewBlockPositions = (gridSpec: GridSpecification) => {
  const maxX = gridSpec.width / gridSpec.cellSize - 1;
  const maxY = gridSpec.height / gridSpec.cellSize - 1;
  for (const block of blocks) {
    const atTopOrBottomEdge = block.hasMovedSinceSpawn && (block.y === 0 || block.y === maxY);
    const atLeftOrRightEdge = block.hasMovedSinceSpawn && (block.x === 0 || block.x === maxX);

    if (atTopOrBottomEdge && atLeftOrRightEdge) {
      flipXDirection(block);
      flipYDirection(block);
      block.isMain && blocks.push(spawnNewBlock(block));
    } else if (atTopOrBottomEdge) {
      flipYDirection(block);
      block.isMain && blocks.push(flipXDirection(spawnNewBlock(block)));
    } else if (atLeftOrRightEdge) {
      flipXDirection(block);
      block.isMain && blocks.push(flipYDirection(spawnNewBlock(block)));
    } else {
      // todo check if out of bounds
    }

    moveToNewPosition(block);
  }
};

function drawNewBlockPositions(
  selection: Transition<SVGRectElement, Block, BaseType, unknown>,
  gridSpec: GridSpecification
) {
  selection
    .attr('x', (d) => d.x * gridSpec.cellSize)
    .attr('y', (d) => d.y * gridSpec.cellSize)
    .attr('width', gridSpec.cellSize)
    .attr('height', gridSpec.cellSize);
}

export function updatePosition(
  grid: Selection<BaseType, unknown, HTMLElement, unknown>,
  gridSpec: GridSpecification
): void {
  calculateNewBlockPositions(gridSpec);
  const blocksElem = grid.selectAll<SVGRectElement, Block>('.grid__block').data(blocks);

  blocksElem
    .enter()
    .append<SVGRectElement>('rect')
    .attr('class', (d) =>
      d.isMain ? 'grid__block grid__block--main' : 'grid__block grid__block--secondary'
    )
    .transition()
    .duration(gridSpec.updateIntervalInMS)
    .ease(easeLinear)
    .on('start', function (block, i) {
      select(this)
        ?.attr('x', block.startPosition.x * gridSpec.cellSize)
        .attr('y', block.startPosition.y * gridSpec.cellSize)
        .attr('width', gridSpec.cellSize)
        .attr('height', gridSpec.cellSize);
    })
    .call(drawNewBlockPositions, gridSpec);

  blocksElem.exit().remove();
  blocksElem
    .transition()
    .duration(gridSpec.updateIntervalInMS)
    .ease(easeLinear)
    .call(drawNewBlockPositions, gridSpec);
}
