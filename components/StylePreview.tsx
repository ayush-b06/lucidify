import { StyleDirection } from '@/utils/projectCategories';

/**
 * Paints a style direction as a small abstract website thumbnail. These are deliberately
 * wireframe-like: they show layout, weight, and colour rather than pretending to be a
 * finished design. Give a direction an `image` and that screenshot is shown instead.
 */
export default function StylePreview({ direction }: { direction: StyleDirection }) {
    const { bg, surface, ink, accent, layout, radius, serif } = direction.preview;

    if (direction.image) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={direction.image} alt="" aria-hidden="true" width={200} height={150} style={{ display: 'block', width: '100%', height: 'auto' }} />;
    }

    const r = Math.max(1, radius / 2);
    const bar = (x: number, y: number, width: number, height: number, fill: string, opacity = 1) =>
        <rect key={`${x}-${y}-${width}`} x={x} y={y} width={width} height={height} rx={Math.min(r, height / 2)} fill={fill} opacity={opacity} />;

    const body = () => {
        switch (layout) {
            case 'centered':
                return <>
                    {bar(45, 46, 110, 9, ink, 0.85)}
                    {bar(65, 61, 70, 6, ink, 0.35)}
                    <rect x={78} y={76} width={44} height={12} rx={radius} fill={accent} />
                    {[12, 76, 140].map(x => bar(x, 100, 48, 34, surface))}
                </>;
            case 'split':
                return <>
                    {bar(12, 48, 76, 8, ink, 0.85)}
                    {bar(12, 60, 62, 8, ink, 0.85)}
                    {bar(12, 76, 44, 5, ink, 0.35)}
                    <rect x={12} y={90} width={46} height={12} rx={radius} fill={accent} />
                    <rect x={106} y={42} width={82} height={88} rx={radius} fill={surface} />
                </>;
            case 'grid':
                return <>
                    {bar(12, 44, 62, 7, ink, 0.8)}
                    {[60, 104].flatMap(y => [12, 72, 132].map(x => bar(x, y, 56, 38, surface)))}
                </>;
            case 'editorial':
                return <>
                    {bar(12, 44, 164, 10, ink, 0.9)}
                    {bar(12, 59, 110, 10, ink, 0.9)}
                    <rect x={12} y={80} width={176} height={1} fill={ink} opacity={0.25} />
                    <rect x={12} y={90} width={11} height={11} rx={r} fill={accent} />
                    {[90, 100, 110, 120].map((y, i) => bar(27, y, i === 3 ? 44 : 67, 4, ink, 0.3))}
                    {[90, 100, 110, 120, 130].map((y, i) => bar(106, y, i === 4 ? 50 : 82, 4, ink, 0.3))}
                </>;
            case 'showcase':
                return <>
                    <rect x={12} y={40} width={176} height={66} rx={radius} fill={surface} />
                    {bar(12, 114, 88, 7, ink, 0.8)}
                    {bar(12, 127, 60, 5, ink, 0.3)}
                    <rect x={140} y={116} width={48} height={14} rx={radius} fill={accent} />
                </>;
            case 'stacked':
            default:
                return <>
                    <rect x={12} y={40} width={80} height={44} rx={radius} fill={surface} />
                    {bar(102, 46, 70, 6, ink, 0.8)}
                    {bar(102, 58, 56, 5, ink, 0.3)}
                    {bar(102, 68, 40, 5, ink, 0.3)}
                    <rect x={108} y={94} width={80} height={44} rx={radius} fill={surface} />
                    {bar(12, 100, 70, 6, ink, 0.8)}
                    {bar(12, 112, 56, 5, ink, 0.3)}
                    <rect x={12} y={124} width={36} height={11} rx={radius} fill={accent} />
                </>;
        }
    };

    return (
        <svg viewBox="0 0 200 150" role="img" aria-hidden="true" focusable="false" style={{ display: 'block', width: '100%', height: 'auto' }}>
            <rect x={0} y={0} width={200} height={150} fill={bg} />

            {/* Browser chrome, so the thumbnail reads as a web page */}
            <rect x={0} y={0} width={200} height={12} fill={ink} opacity={0.07} />
            {[10, 18, 26].map(cx => <circle key={cx} cx={cx} cy={6} r={2} fill={ink} opacity={0.22} />)}

            {/* Site nav */}
            <rect x={12} y={18} width={16} height={9} rx={r} fill={accent} />
            {[150, 164, 178].map(x => <rect key={x} x={x} y={21} width={10} height={3} rx={1.5} fill={ink} opacity={0.28} />)}
            {serif && <rect x={12} y={31} width={176} height={0.75} fill={ink} opacity={0.18} />}

            {body()}
        </svg>
    );
}
