import { _decorator, Component, Node, Sprite, Color, Vec3, input, Input, EventTouch, tween, UITransform } from 'cc';
const { ccclass, property } = _decorator;

// 定义颜色类型
type ColorType = number;

// 定义网格类
class Grid {
    private rows: number;
    private cols: number;
    private grid: ColorType[][];
    private sprites: Sprite[][];

    constructor(rows: number, cols: number, initialColors: ColorType[][], sprites: Sprite[][]) {
        this.rows = rows;
        this.cols = cols;
        this.grid = initialColors;
        this.sprites = sprites;
        this.updateSprites();
    }

    // 获取指定位置的颜色
    getColor(x: number, y: number): ColorType {
        return this.grid[x][y];
    }

    // 设置指定位置的颜色
    setColor(x: number, y: number, color: ColorType): void {
        this.grid[x][y] = color;
        this.updateSpriteColor(x, y, color);
    }

    // 获取相邻位置
    getNeighbors(x: number, y: number): [number, number][] {
        const neighbors: [number, number][] = [];
        if (x > 0) neighbors.push([x - 1, y]);
        if (x < this.rows - 1) neighbors.push([x + 1, y]);
        if (y > 0) neighbors.push([x, y - 1]);
        if (y < this.cols - 1) neighbors.push([x, y + 1]);
        return neighbors;
    }

    // 填充指定位置及其相邻同色区域的颜色
    floodFill(x: number, y: number, newColor: ColorType): void {
        const originalColor = this.getColor(x, y);
        if (originalColor === newColor) return;

        const queue: [number, number][] = [[x, y]];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const [currentX, currentY] = queue.shift()!;
            if (visited.has(`${currentX},${currentY}`)) continue;
            visited.add(`${currentX},${currentY}`);

            if (this.getColor(currentX, currentY) === originalColor) {
                this.setColorWithTween(currentX, currentY, newColor);
                const neighbors = this.getNeighbors(currentX, currentY);
                neighbors.forEach(([nx, ny]) => queue.push([nx, ny]));
            }
        }
    }

    // 检查是否所有区域颜色相同
    isUniform(): boolean {
        const firstColor = this.getColor(0, 0);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.getColor(i, j) !== firstColor) {
                    return false;
                }
            }
        }
        return true;
    }

    // 更新所有精灵的颜色
    private updateSprites(): void {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.updateSpriteColor(i, j, this.grid[i][j]);
            }
        }
    }

    // 更新单个精灵的颜色
    private updateSpriteColor(x: number, y: number, color: ColorType): void {
        let spriteColor: Color;
        switch (color) {
            case 1:
                spriteColor = Color.RED;
                break;
            case 2:
                spriteColor = Color.BLUE;
                break;
            default:
                spriteColor = Color.WHITE;
                break;
        }
        this.sprites[x][y].color = spriteColor;
    }
    // 带渐变效果设置颜色
    private setColorWithTween(x: number, y: number, newColor: ColorType) {
        const sprite = this.sprites[x][y];
        const originalColor = sprite.color.clone();
        let targetColor: Color;
        switch (newColor) {
            case 1:
                targetColor = Color.RED;
                break;
            case 2:
                targetColor = Color.BLUE;
                break;
            default:
                targetColor = Color.WHITE;
                break;
        }

        // 随机化渐变时间
        const duration = Math.random() * 0.5 + 0.2; 

        // 颜色插值过渡
        const startR = originalColor.r;
        const startG = originalColor.g;
        const startB = originalColor.b;
        const endR = targetColor.r;
        const endG = targetColor.g;
        const endB = targetColor.b;

        tween(sprite)
           .to(duration, { 
                color: {
                    r: endR,
                    g: endG,
                    b: endB
                }
            }, {
                easing: 'quadOut',
                onUpdate: (target, ratio) => {
                    const currentR = startR + (endR - startR) * ratio;
                    const currentG = startG + (endG - startG) * ratio;
                    const currentB = startB + (endB - startB) * ratio;
                    target.color = new Color(currentR, currentG, currentB);
                }
            })
           .start();

        this.grid[x][y] = newColor;
    }
}

@ccclass('ColorFloodGame')
export class ColorFloodGame extends Component {
    @property([Node])
    blocks: Node[] = [];

    private grid: Grid;
    private maxSteps: number = 3;
    private currentSteps: number = 0;
    private targetColor: ColorType = 2;
    private rows: number = 3;
    private cols: number = 3;

    start() {
        const initialColors: ColorType[][] = [
            [1, 1, 1],
            [2, 2, 2],
            [2, 1, 1]
        ];
        const sprites: Sprite[][] = [];
        for (let i = 0; i < this.rows; i++) {
            sprites[i] = [];
            for (let j = 0; j < this.cols; j++) {
                const index = i * this.cols + j;
                sprites[i][j] = this.blocks[index].getComponent(Sprite)!;
            }
        }
        this.grid = new Grid(this.rows, this.cols, initialColors, sprites);

        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onTouchStart(event: EventTouch) {
        const touchPos = event.getLocation();
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const index = i * this.cols + j;
                const block = this.blocks[index];
                const sprite = block.getComponent(Sprite)!;
                const worldPos = block.getWorldPosition();
                const size = sprite.node.getComponent(UITransform).contentSize;
                const halfWidth = size.width / 2;
                const halfHeight = size.height / 2;
                if (
                    touchPos.x >= worldPos.x - halfWidth &&
                    touchPos.x <= worldPos.x + halfWidth &&
                    touchPos.y >= worldPos.y - halfHeight &&
                    touchPos.y <= worldPos.y + halfHeight
                ) {
                    this.makeMove(i, j, this.targetColor);
                    return;
                }
            }
        }
    }

    makeMove(x: number, y: number, newColor: ColorType) {
        if (this.currentSteps >= this.maxSteps) {
            console.log('步数已用完，游戏失败！');
            return;
        }

        this.grid.floodFill(x, y, newColor);
        this.currentSteps++;

        console.log(`第 ${this.currentSteps} 步操作后`);

        if (this.grid.isUniform() && this.grid.getColor(0, 0) === this.targetColor) {
            console.log(`恭喜你，在 ${this.currentSteps} 步内完成任务，游戏胜利！`);
        } else if (this.currentSteps >= this.maxSteps) {
            console.log('步数已用完，游戏失败！');
        }
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
    }
}