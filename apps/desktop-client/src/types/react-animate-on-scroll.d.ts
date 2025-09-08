declare module 'react-animate-on-scroll' {
  import { ComponentType, ReactNode } from 'react';

  interface ScrollAnimationProps {
    animateIn?: string;
    animateOut?: string;
    animateOnce?: boolean;
    animatePreScroll?: boolean;
    delay?: number;
    duration?: number;
    initiallyVisible?: boolean;
    offset?: number;
    scrollableParentSelector?: string;
    style?: React.CSSProperties;
    afterAnimatedIn?: (visibleState: any) => void;
    afterAnimatedOut?: (visibleState: any) => void;
    children?: ReactNode;
  }

  const ScrollAnimation: ComponentType<ScrollAnimationProps>;
  export default ScrollAnimation;
}