// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import React, { useState, useRef, useEffect } from 'react';
// import styled from 'styled-components';

const InfiniteSlider = ({ children, speed = 1 }) => {
  const sliderRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const animationRef = useRef(null);
  const itemsRef = useRef([]);

  // 克隆子元素以创建无限循环效果
  const duplicatedChildren = React.Children.toArray(children).concat(
    React.Children.toArray(children),
  );

  // 动画逻辑
  const animate = () => {
    if (isHovered || isDragging) return;

    setTranslateX((prev) => {
      const newX = prev - speed;
      // 当滑动到一半时重置位置，实现无缝循环
      if (
        contentRef.current &&
        sliderRef.current &&
        Math.abs(newX) >=
          parseFloat(getComputedStyle(contentRef.current).width) -
            parseFloat(getComputedStyle(sliderRef.current).width)
      ) {
        const contentWidth = parseFloat(
          getComputedStyle(contentRef.current).width,
        );
        const sliderWidth = parseFloat(
          getComputedStyle(sliderRef.current).width,
        );
        if (Math.abs(newX) >= contentWidth - sliderWidth) {
          // reaches the end
          const resetPosition = sliderWidth - contentWidth / 2;
          contentRef.current!.style.transform = `translateX(${resetPosition}px)`;
        }

        return sliderWidth - contentWidth / 2;
      }
      return newX;
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  // 处理鼠标/触摸悬停
  const handlePointerEnter = () => {
    setIsHovered(true);
    cancelAnimationFrame(animationRef.current);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setIsDragging(false);
    if (!isDragging) {
      animate();
    }
  };

  // 处理拖动/触摸开始
  const handleDragStart = (clientX) => {
    setIsDragging(true);
    setStartX(clientX);
    setScrollLeft(translateX);
    cancelAnimationFrame(animationRef.current);
  };

  // 处理拖动/触摸过程
  const handleDragMove = (clientX) => {
    if (!isDragging) return;
    const walk = startX - clientX; // 乘以2增加拖动灵敏度
    let targetDelta = scrollLeft - walk;
    if (targetDelta > 0) {
      targetDelta = 0;
    }
    if (sliderRef.current && contentRef.current) {
      const sliderWidth = parseFloat(getComputedStyle(sliderRef.current).width);
      const contentWidth = parseFloat(
        getComputedStyle(contentRef.current).width,
      );
      if (targetDelta < sliderWidth - contentWidth) {
        targetDelta = sliderWidth - contentWidth;
      }
    }

    setTranslateX(targetDelta);
  };

  // 处理拖动/触摸结束
  const handleDragEnd = () => {
    setIsDragging(false);
    if (!isHovered) {
      animate();
    }
  };

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // 触摸事件处理
  const handleTouchStart = (e) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // 初始化动画
  useEffect(() => {
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isHovered, isDragging]);

  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        WebkitOverflowScrolling: 'touch',
      }}
      ref={sliderRef}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={contentRef}
        style={{
          transform: `translateX(${translateX}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'pan-y', // 允许垂直滚动
          display: 'flex',
          flexShrink: 0,
          willChange: 'transform',
          width: 'max-content',
          userSelect: 'none',
        }}
      >
        {duplicatedChildren.map((child, index) => (
          <div
            style={{
              flex: '0 0 auto',
              padding: '0 10px',
              WebkitTapHighlightColor: 'transparent',
            }}
            key={index}
            ref={(el) => (itemsRef.current[index] = el)}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

// 样式组件
// const SliderContainer = styled.div`
//   width: 100%;
//   overflow: hidden;
//   position: relative;
//   display: flex;
//   flex-direction: row;
//   -webkit-overflow-scrolling: touch; /* iOS平滑滚动 */
// `;

// const SliderContent = styled.div`
//   display: flex;
//   flex-shrink: 0;
//   will-change: transform;
//   width: max-content;
//   user-select: none; /* 防止文本选择 */
// `;

// const SliderItem = styled.div`
//   flex: 0 0 auto;
//   padding: 0 10px;
//   -webkit-tap-highlight-color: transparent; /* 移除移动端点击高亮 */
// `;

export default InfiniteSlider;
