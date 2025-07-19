import React, { useEffect, useState } from 'react';
import IncomingCallPanel from './IncomingCallPanel';
import { VideoConfManager } from './VideoConfManager';
import { clearIncomingCall, subscribeToIncomingCall } from './incomingCallStore';

const IncomingCallBridge = () => {
const [callData, setCallData] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToIncomingCall(setCallData);
    return () => unsubscribe();
  }, []);

  if (!callData) return null;

  return (

    <IncomingCallPanel
      visible={!!callData}
      callerName={callData?.callerName}
      onJoin={() => {
        VideoConfManager.joinCall(callData?.callId); 
        clearIncomingCall();
      }}
      onDismiss={() => {
        clearIncomingCall();
      }}
      username={callData?.username}
    />

  );
};

export default IncomingCallBridge;
