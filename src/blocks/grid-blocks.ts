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
  direction: MoveDirection;
  isMain: boolean;
};

const moveTopRight = (b: Block, spawn: boolean): void => {
  if (spawn) {
    blocks.push({ ...b, direction: getOppositeDirection(b.direction), isMain: false });
  }

  b.direction = MoveDirection.TopRight;
  b.x++;
  b.y--;
};
const moveTopLeft = (b: Block, spawn: boolean): void => {
  if (spawn) {
    blocks.push({ ...b, direction: getOppositeDirection(b.direction), isMain: false });
  }
  b.direction = MoveDirection.TopLeft;
  b.x--;
  b.y--;
};
const moveBotLeft = (b: Block, spawn: boolean): void => {
  if (spawn) {
    blocks.push({ ...b, direction: getOppositeDirection(b.direction), isMain: false });
  }
  b.direction = MoveDirection.BottomLeft;
  b.x--;
  b.y++;
};
const moveBotRight = (b: Block, spawn: boolean): void => {
  if (spawn) {
    blocks.push({ ...b, direction: getOppositeDirection(b.direction), isMain: false });
  }
  b.direction = MoveDirection.BottomRight;
  b.y++;
  b.x++;
};

const blocks: Block[] = [
  {
    direction: MoveDirection.BottomRight,
    isMain: true,
    x: 0,
    y: 0,
  },
];

const calculateNewBlockPositions = (gridSpec: GridSpecification) => {
  const maxX = gridSpec.width / gridSpec.cellSize;
  const maxY = gridSpec.height / gridSpec.cellSize;
  for (const block of blocks) {
    const canMoveBotRight = block.x + 1 < maxX && block.y + 1 < maxY;
    const canMoveBotLeft = block.x - 1 >= 0 && block.y + 1 < maxY;
    const canMoveTopLeft = block.x - 1 >= 0 && block.y - 1 >= 0;
    const canMoveTopRight = block.x + 1 < maxX && block.y - 1 >= 0;

    if (block.direction === MoveDirection.BottomRight && canMoveBotRight)
      moveBotRight(block, false);
    else if (block.direction === MoveDirection.BottomRight && canMoveTopRight)
      moveTopRight(block, block.isMain);
    else if (block.direction === MoveDirection.BottomRight && canMoveBotLeft)
      moveBotLeft(block, block.isMain);
    else if (block.direction === MoveDirection.BottomRight && canMoveTopLeft)
      moveTopLeft(block, block.isMain);
    else if (block.direction === MoveDirection.TopRight && canMoveTopRight)
      moveTopRight(block, false);
    else if (block.direction === MoveDirection.TopRight && canMoveBotRight)
      moveBotRight(block, block.isMain);
    else if (block.direction === MoveDirection.TopRight && canMoveTopLeft)
      moveTopLeft(block, block.isMain);
    else if (block.direction === MoveDirection.TopRight && canMoveBotLeft)
      moveBotLeft(block, block.isMain);
    else if (block.direction === MoveDirection.BottomLeft && canMoveBotLeft)
      moveBotLeft(block, false);
    else if (block.direction === MoveDirection.BottomLeft && canMoveBotRight)
      moveBotRight(block, block.isMain);
    else if (block.direction === MoveDirection.BottomLeft && canMoveTopLeft)
      moveTopLeft(block, block.isMain);
    else if (block.direction === MoveDirection.BottomLeft && canMoveTopRight)
      moveTopRight(block, block.isMain);
    else if (block.direction === MoveDirection.TopLeft && canMoveTopLeft) moveTopLeft(block, false);
    else if (block.direction === MoveDirection.TopLeft && canMoveBotLeft)
      moveBotLeft(block, block.isMain);
    else if (block.direction === MoveDirection.TopLeft && canMoveTopRight)
      moveTopRight(block, block.isMain);
    else if (block.direction === MoveDirection.TopLeft && canMoveBotRight)
      moveBotRight(block, block.isMain);
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
  const blocksElem = grid
    .selectAll<SVGRectElement, Block>('.grid__block')
    .data(blocks, (a, b, c) => 'a');

  blocksElem
    .enter()
    .append('rect')
    .attr('class', (d) =>
      d.isMain ? 'grid__block grid__block--main' : 'grid__block grid__block--secondary'
    )
    .transition()
    .duration(gridSpec.updateIntervalInMS)
    .ease(easeLinear)
    .on('start', function (d, i) {
      // animate from the correct direction. This doesn't strictly handle all cases
      select(this)
        ?.attr(
          'x',
          d.direction === MoveDirection.TopLeft || d.direction === MoveDirection.BottomLeft
            ? d.x * gridSpec.cellSize + gridSpec.cellSize
            : d.x * gridSpec.cellSize - gridSpec.cellSize
        )
        .attr(
          'y',
          d.direction === MoveDirection.TopLeft || d.direction === MoveDirection.TopRight
            ? gridSpec.height
            : 0
        )
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
