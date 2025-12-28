import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

type DrawerDirection = "top" | "bottom" | "left" | "right"

const DrawerContext = React.createContext<{ direction?: DrawerDirection }>({})

const Drawer = ({
  shouldScaleBackground = true,
  direction,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & { direction?: DrawerDirection }) => (
  <DrawerContext.Provider value={{ direction }}>
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      direction={direction}
      {...props}
    />
  </DrawerContext.Provider>
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/40", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  const { direction } = React.useContext(DrawerContext)
  const isHorizontal = direction === "left" || direction === "right"

  // For side drawers, add gap from edge and use --initial-transform for animation
  const sideDrawerGap = 8
  const sideDrawerStyle = isHorizontal
    ? {
        ...style,
        // ...(direction === "right" && { right: `${sideDrawerGap}px`, top: `${sideDrawerGap}px`, bottom: `${sideDrawerGap}px` }),
        // ...(direction === "left" && { left: `${sideDrawerGap}px`, top: `${sideDrawerGap}px`, bottom: `${sideDrawerGap}px` }),
        '--initial-transform': `calc(100% + ${sideDrawerGap}px)` as React.CSSProperties['--initial-transform'],
      } as React.CSSProperties
    : style

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col bg-background outline-none",
          // Bottom drawer (default)
          !isHorizontal && "inset-x-0 bottom-0 mt-24 h-auto rounded-t-[10px] border",
          // Right drawer - with gap from edge, no border (gap provides visual separation)
          direction === "right" && "inset-y-0 right-2 h-full w-[600px] max-w-[90vw] rounded-[16px] shadow-lg",
          // Left drawer - with gap from edge, no border (gap provides visual separation)
          direction === "left" && "inset-y-0 left-2 h-full w-[600px] max-w-[90vw] rounded-[16px] shadow-lg",
          // Top drawer
          direction === "top" && "inset-x-0 top-0 mb-24 h-auto rounded-b-[10px] border",
          className
        )}
        style={sideDrawerStyle}
        {...props}
      >
        {/* Handle bar - horizontal for vertical drawers, vertical for horizontal drawers */}
        {isHorizontal ? (
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 h-[100px] w-2 rounded-full bg-muted",
            direction === "right" ? "left-4" : "right-4"
          )} />
        ) : (
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        )}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-2 p-4 mt-auto", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold tracking-tight leading-none",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer, DrawerClose,
  DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerPortal, DrawerTitle, DrawerTrigger
}
