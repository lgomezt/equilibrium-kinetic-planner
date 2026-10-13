import {useLayoutEffect} from 'react';
import {createStaticBatch,createActuatorBatches} from './static-batch.js';
export {createStaticBatch} from './static-batch.js';

export default function StaticBatch({rootRef}) {
 useLayoutEffect(() => {
  const root = rootRef?.current;
  if (!root) return;
  const batch = createStaticBatch(root);
  const actuators = createActuatorBatches(root);
  return () => {actuators.dispose();batch.dispose();};
 }, [rootRef]);
 return null;
}
