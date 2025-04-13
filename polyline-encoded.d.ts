declare module 'polyline-encoded' {
    export function decode(str: string): [number, number][];
    export function encode(coordinates: [number, number][]): string;
}