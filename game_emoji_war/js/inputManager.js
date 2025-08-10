(function(global){
  const Actions = {
    MOVE_LEFT: 'MOVE_LEFT',
    MOVE_RIGHT: 'MOVE_RIGHT',
    AIM_UP: 'AIM_UP',
    AIM_DOWN: 'AIM_DOWN',
    JUMP: 'JUMP',
    FIRE_START: 'FIRE_START',
    FIRE_END: 'FIRE_END',
    CHANGE_WEAPON: 'CHANGE_WEAPON'
  };

  const callbacks = {};
  Object.values(Actions).forEach(a => callbacks[a] = []);

  function on(action, cb){
    if(callbacks[action]) callbacks[action].push(cb);
  }

  function emit(action){
    (callbacks[action] || []).forEach(cb => cb());
  }

  // Keyboard support
  const keyDownMap = {
    ArrowLeft: Actions.MOVE_LEFT,
    ArrowRight: Actions.MOVE_RIGHT,
    ArrowUp: Actions.AIM_UP,
    ArrowDown: Actions.AIM_DOWN,
    ' ': Actions.JUMP,
    Enter: Actions.FIRE_START
  };
  const keyUpMap = {
    Enter: Actions.FIRE_END
  };
  document.addEventListener('keydown', e => {
    const action = keyDownMap[e.key];
    if(action){
      e.preventDefault();
      emit(action);
    }
  });
  document.addEventListener('keyup', e => {
    const action = keyUpMap[e.key];
    if(action){
      e.preventDefault();
      emit(action);
    }
  });

  // Pointer events (mouse/touch/stylus)
  const holdTimers = {};
  function clearHold(action){
    if(holdTimers[action]){
      clearInterval(holdTimers[action]);
      delete holdTimers[action];
    }
  }
  document.addEventListener('pointerdown', e => {
    const actionKey = e.target.dataset.action;
    if(actionKey){
      e.preventDefault();
      if(actionKey === 'FIRE'){
        emit(Actions.FIRE_START);
      } else {
        emit(Actions[actionKey]);
      }
      if(e.target.dataset.hold === 'true' && actionKey !== 'FIRE'){
        holdTimers[actionKey] = setInterval(() => emit(Actions[actionKey]), 100);
      }
    }
  });
  document.addEventListener('pointerup', e => {
    const actionKey = e.target.dataset.action;
    if(actionKey){
      e.preventDefault();
      clearHold(actionKey);
      if(actionKey === 'FIRE') emit(Actions.FIRE_END);
    }
  });
  document.addEventListener('pointerleave', e => {
    const actionKey = e.target.dataset.action;
    if(actionKey){
      clearHold(actionKey);
      if(actionKey === 'FIRE') emit(Actions.FIRE_END);
    }
  });

  // Gamepad support
  const prevState = { fire:false, jump:false, change:false };
  function pollGamepads(){
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for(const gp of gamepads){
      if(!gp) continue;
      const axes = gp.axes || [];
      if(axes[0] < -0.5) emit(Actions.MOVE_LEFT);
      if(axes[0] > 0.5) emit(Actions.MOVE_RIGHT);
      if(axes[1] < -0.5) emit(Actions.AIM_UP);
      if(axes[1] > 0.5) emit(Actions.AIM_DOWN);

      const fire = gp.buttons[0] && gp.buttons[0].pressed;
      const jump = gp.buttons[1] && gp.buttons[1].pressed;
      const change = gp.buttons[2] && gp.buttons[2].pressed;

      if(fire && !prevState.fire) emit(Actions.FIRE_START);
      if(!fire && prevState.fire) emit(Actions.FIRE_END);
      if(jump && !prevState.jump) emit(Actions.JUMP);
      if(change && !prevState.change) emit(Actions.CHANGE_WEAPON);

      prevState.fire = fire;
      prevState.jump = jump;
      prevState.change = change;
    }
    requestAnimationFrame(pollGamepads);
  }
  pollGamepads();

  global.InputManager = { Actions, on };
})(window);
