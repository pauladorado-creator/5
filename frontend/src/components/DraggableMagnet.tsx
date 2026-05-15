import { useEffect, useRef, useState } from "react";
import { Animated, Image, PanResponder, StyleSheet } from "react-native";
import { storage } from "@/src/utils/storage";

type Props = {
  uri: string;
  storageKey: string;
  initial: { x: number; y: number };
  size?: number;
};

export function DraggableMagnet({ uri, storageKey, initial, size = 95 }: Props) {
  const [ready, setReady] = useState(false);
  const pan = useRef(new Animated.ValueXY(initial)).current;
  const last = useRef({ ...initial });

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem<string>(storageKey, "");
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (typeof p?.x === "number" && typeof p?.y === "number") {
            last.current = p;
            pan.setValue(p);
          }
        } catch {}
      }
      setReady(true);
    })();
  }, [storageKey]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        pan.setOffset({ x: last.current.x, y: last.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        const nx = last.current.x + g.dx;
        const ny = last.current.y + g.dy;
        last.current = { x: nx, y: ny };
        pan.flattenOffset();
        storage.setItem(storageKey, JSON.stringify(last.current));
      },
    })
  ).current;

  if (!ready) return null;

  return (
    <Animated.View
      style={[styles.wrap, { width: size, height: size }, pan.getLayout()]}
      {...responder.panHandlers}
    >
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute" },
});
