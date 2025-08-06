import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import gsap from 'gsap';

const WheelContainer = styled.div`
  position: relative;
  width: 800px;
  height: 400px;
  margin: 50px auto;
  background: #f5f5f5;
  border-radius: 10px;
  padding: 20px;
  overflow: hidden;
`;

const SVGContainer = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const Wheel = styled.div`
  position: absolute;
  width: 300px;
  height: 300px;
  border: 20px solid #1a237e;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(25, 118, 210, 0.1);
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 90%;
    height: 90%;
    transform: translate(-50%, -50%);
    border: 12px dashed #1976d2;
    border-radius: 50%;
  }
`;

const Belt = styled.div<{ side: 'left' | 'right' }>`
  position: absolute;
  height: 30px;
  background: #1a237e;
  width: 200px;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.side === 'left' ? 'left: 40px;' : 'right: 40px;'}
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.1) 10px,
      rgba(255, 255, 255, 0.1) 20px
    );
    animation: moveStripes 1s linear infinite;
  }

  @keyframes moveStripes {
    from { background-position: 0 0; }
    to { background-position: 20px 0; }
  }
`;

const NumberItem = styled.div<{ status: 'entering' | 'waiting' | 'exiting' }>`
  width: 50px;
  height: 50px;
  background: ${props => 
    props.status === 'entering' ? '#4CAF50' :
    props.status === 'waiting' ? '#FFA000' :
    '#f44336'};
  border-radius: 50%;
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  transform: translate(-50%, -50%);
  transition: background-color 0.3s;
`;

const WheelNumbers = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 20px;
`;

const ConveyorWheel: React.FC = () => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [collectedNumbers, setCollectedNumbers] = useState<number[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  const itemsRef = useRef<{ [key: number]: HTMLDivElement }>({});
  const numbersInWheel = useRef<number[]>([]);

  useEffect(() => {
    const numbersToCollect = 10;
    
    // Wheel rotation animation
    gsap.to(wheelRef.current, {
      rotation: 360,
      duration: 8,
      repeat: -1,
      ease: "linear",
    });

    const createPath = () => {
      const container = containerRef.current;
      const wheel = wheelRef.current;
      if (!container || !wheel) return null;

      const containerRect = container.getBoundingClientRect();
      const wheelRect = wheel.getBoundingClientRect();

      // Calculate key points
      const startX = 40;
      const endX = containerRect.width - 40;
      const centerY = containerRect.height / 2;
      const wheelCenterX = containerRect.width / 2;
      const wheelRadius = wheelRect.width / 2;

      // Create SVG path
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const d = [
        `M ${startX} ${centerY}`, // Start at left belt
        `L ${wheelCenterX - wheelRadius - 20} ${centerY}`, // Line to wheel edge
        `A ${wheelRadius} ${wheelRadius} 0 1 0 ${wheelCenterX + wheelRadius + 20} ${centerY}`, // Arc around wheel
        `L ${endX} ${centerY}` // Line to end
      ].join(' ');
      
      path.setAttribute('d', d);
      path.setAttribute('stroke', 'none');
      path.setAttribute('fill', 'none');
      
      svgRef.current?.appendChild(path);
      return path;
    };

    const createNumberItem = (value: number) => {
      const path = createPath();
      if (!path) return;

      const item = document.createElement('div');
      item.className = NumberItem.styledComponentId || '';
      item.setAttribute('data-status', 'entering');
      item.textContent = value.toString();
      containerRef.current?.appendChild(item);
      itemsRef.current[value] = item;

      // Follow path animation
      gsap.to(item, {
        motionPath: {
          path: path,
          align: path,
          alignOrigin: [0.5, 0.5],
          autoRotate: true
        },
        duration: 4,
        ease: "none",
        onComplete: () => {
          numbersInWheel.current.push(value);
          if (numbersInWheel.current.length === numbersToCollect) {
            path.remove();
            startSorting(numbersInWheel.current);
          }
        }
      });

      return item;
    };

    const startSorting = (numbers: number[]) => {
      setIsSorting(true);
      const sorted = [...numbers].sort((a, b) => b - a);
      setCollectedNumbers(sorted);

      // Position numbers in a grid inside the wheel
      sorted.forEach((num, index) => {
        const item = itemsRef.current[num];
        if (item) {
          item.setAttribute('data-status', 'waiting');
          gsap.to(item, {
            x: `${(index % 3 - 1) * 60}px`,
            y: `${Math.floor(index / 3) * 60 - 60}px`,
            duration: 0.5
          });
        }
      });

      setTimeout(() => {
        releaseNumbers(sorted);
      }, 2000);
    };

    const releaseNumbers = (sorted: number[]) => {
      sorted.forEach((num, index) => {
        const item = itemsRef.current[num];
        if (item) {
          item.setAttribute('data-status', 'exiting');
          const path = createPath();
          if (!path) return;

          // Start from current position and follow path to end
          gsap.to(item, {
            motionPath: {
              path: path,
              align: path,
              alignOrigin: [0.5, 0.5],
              autoRotate: true,
              start: 0.5, // Start from middle of path
              end: 1 // Go to end
            },
            duration: 2,
            delay: index * 0.3,
            ease: "none",
            onComplete: () => {
              path.remove();
              item.remove();
              if (index === sorted.length - 1) {
                numbersInWheel.current = [];
                setCollectedNumbers([]);
                setIsSorting(false);
                startNewBatch();
              }
            }
          });
        }
      });
    };

    const startNewBatch = () => {
      const numbers = new Set<number>();
      while (numbers.size < numbersToCollect) {
        numbers.add(Math.floor(Math.random() * 99) + 1);
      }
      
      Array.from(numbers).forEach((num, index) => {
        setTimeout(() => {
          createNumberItem(num);
        }, index * 500);
      });
    };

    startNewBatch();

    return () => {
      gsap.killTweensOf(wheelRef.current);
      Object.values(itemsRef.current).forEach(item => {
        gsap.killTweensOf(item);
        item.remove();
      });
    };
  }, []);

  return (
    <WheelContainer ref={containerRef}>
      <SVGContainer ref={svgRef} />
      <Belt side="left" />
      <Belt side="right" />
      <Wheel ref={wheelRef} />
      {isSorting && (
        <WheelNumbers>
          {collectedNumbers.map((num) => (
            <div key={num}>{num}</div>
          ))}
        </WheelNumbers>
      )}
    </WheelContainer>
  );
};

export default ConveyorWheel; 