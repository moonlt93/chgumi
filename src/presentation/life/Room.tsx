'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { SHOP } from '@/domain/life/catalog';
import type { LifeState } from '@/domain/life/model';

function Block({
  x,
  y,
  z,
  width,
  depth,
  height,
  color,
}: {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}) {
  const style = {
    left: x,
    top: y,
    width,
    height: depth,
    '--w': `${width}px`,
    '--d': `${depth}px`,
    '--h': `${height}px`,
    '--color': color,
    transform: `translateZ(${z}px)`,
  } as CSSProperties;
  return (
    <div className="room-block" style={style}>
      {['top', 'front', 'back', 'left', 'right'].map((face) => (
        <i key={face} className={`block-${face}`} />
      ))}
    </div>
  );
}
const ACTIONS = [
  { id: 'wave', label: '인사', message: '반가워요. 오늘은 어떻게 지냈나요?' },
  { id: 'jump', label: '점프', message: '가볍게 몸을 움직여 봐요.' },
  { id: 'stretch', label: '기지개', message: '어깨를 펴고 잠깐 쉬어 가요.' },
] as const;

export function Room({ equipped }: { equipped: LifeState['equipped'] }) {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [motion, setMotion] = useState({ index: -1, sequence: 0, playing: false });
  useEffect(() => {
    const element = stage.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(entry.contentRect.width / 360, entry.contentRect.height / 300, 1.1));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const action = ACTIONS[motion.index];
  function play(index: number) {
    setMotion((previous) => ({ index, sequence: previous.sequence + 1, playing: true }));
  }
  const shirt = SHOP.find((item) => item.id === equipped.outfit)?.color || '#ded6c8';
  return (
    <section className="interactive-room">
      <div
        ref={stage}
        className="room-stage"
        role="group"
        aria-label={`나의 입체 자취방. ${
          Object.values(equipped)
            .map((id) => SHOP.find((item) => item.id === id)?.name)
            .join(', ') || '기본 가구와 캐릭터'
        }`}
      >
        <div className="room-camera" style={{ '--room-scale': scale } as CSSProperties}>
          <div className="room-world">
            <Block x={0} y={0} z={0} width={270} depth={230} height={7} color="#c8ae8e" />
            <Block x={0} y={0} z={7} width={270} depth={5} height={125} color="#e8dfd0" />
            <Block x={9} y={26} z={7} width={73} depth={141} height={21} color="#957f65" />
            <Block x={10} y={27} z={28} width={71} depth={138} height={12} color="#f5eee0" />
            <Block x={10} y={65} z={40} width={71} depth={100} height={5} color="#8eaa99" />
            <Block x={19} y={32} z={40} width={52} depth={26} height={8} color="#fffaf0" />
            <Block x={154} y={10} z={65} width={94} depth={42} height={6} color="#ac8864" />
            <Block x={158} y={14} z={7} width={5} depth={5} height={58} color="#967659" />
            <Block x={237} y={42} z={7} width={5} depth={5} height={58} color="#967659" />
            <Block x={186} y={62} z={7} width={28} depth={28} height={31} color="#a6a18b" />
            <Block x={36} y={5} z={78} width={61} depth={2} height={40} color="#abc6c5" />
            {equipped.rug && (
              <Block x={93} y={103} z={7} width={142} depth={111} height={2} color="#ede0c2" />
            )}
            {equipped.art && (
              <Block x={116} y={5} z={85} width={30} depth={3} height={31} color="#93aa86" />
            )}
            {equipped.plant && (
              <>
                <Block x={223} y={20} z={71} width={15} depth={15} height={16} color="#b87757" />
                <Block x={219} y={17} z={87} width={23} depth={21} height={22} color="#61815f" />
              </>
            )}
            {equipped.lamp && (
              <>
                <Block x={163} y={20} z={71} width={12} depth={12} height={3} color="#aa844f" />
                <Block x={168} y={25} z={74} width={3} depth={3} height={20} color="#aa844f" />
                <Block x={159} y={17} z={94} width={20} depth={20} height={12} color="#edbc71" />
              </>
            )}
            <div
              key={motion.sequence}
              className={`room-avatar ${motion.playing ? `avatar-${action.id}` : ''}`}
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget) {
                  setMotion((previous) => ({ ...previous, playing: false }));
                }
              }}
            >
              <Block x={130} y={144} z={9} width={12} depth={19} height={8} color="#faf7ef" />
              <Block x={148} y={144} z={9} width={12} depth={19} height={8} color="#faf7ef" />
              <Block x={130} y={144} z={17} width={12} depth={13} height={31} color="#4b504b" />
              <Block x={148} y={144} z={17} width={12} depth={13} height={31} color="#4b504b" />
              <Block x={128} y={141} z={48} width={34} depth={19} height={33} color={shirt} />
              <div className="avatar-arm avatar-arm-left">
                <Block x={116} y={144} z={48} width={10} depth={13} height={29} color={shirt} />
                <Block x={116} y={144} z={41} width={10} depth={13} height={7} color="#d6ac89" />
              </div>
              <div className="avatar-arm avatar-arm-right">
                <Block x={164} y={144} z={48} width={10} depth={13} height={29} color={shirt} />
                <Block x={164} y={144} z={41} width={10} depth={13} height={7} color="#d6ac89" />
              </div>

              <Block x={132} y={140} z={81} width={26} depth={23} height={24} color="#e5bd9c" />
              <Block x={131} y={139} z={103} width={28} depth={25} height={7} color="#48413b" />
              <Block x={137} y={163} z={91} width={3} depth={1} height={3} color="#403c37" />
              <Block x={150} y={163} z={91} width={3} depth={1} height={3} color="#403c37" />
              <button
                type="button"
                className="avatar-touch"
                aria-label="아바타 터치: 다음 동작"
                onClick={() => play((motion.index + 1) % ACTIONS.length)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="avatar-controls">
        <p className="avatar-message" role="status">
          {action ? action.message : '아바타를 누르거나 동작을 골라보세요.'}
        </p>
        <div className="avatar-actions" aria-label="아바타 동작">
          {ACTIONS.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={motion.playing && motion.index === index}
              onClick={() => play(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
