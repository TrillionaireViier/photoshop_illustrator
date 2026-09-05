import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { MousePointer2, Paintbrush, Eraser, Square, Circle, Layers, Trash2, LogIn, LogOut, Undo, Redo, ChevronUp, ChevronDown } from 'lucide-react';
import './index.css';

// Simple Toast component inline
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--primary-color)', color: 'white', padding: '12px 24px',
      borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 500,
      animation: 'slideUp 0.3s ease-out forwards'
    }}>
      {message}
    </div>
  );
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#5c67ff');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [layers, setLayers] = useState<any[]>([]);
  
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('user_token'));
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  
  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const isHistoryUpdate = useRef(false);

  const showToast = (msg: string) => setToastMessage(msg);

  // Initialize Canvas
  useEffect(() => {
    if (canvasRef.current) {
      const initCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        isDrawingMode: false,
        preserveObjectStacking: true,
      });

      setCanvas(initCanvas);

      // Load from local storage if exists
      const savedData = localStorage.getItem('photoshop-clone-data');
      if (savedData) {
        initCanvas.loadFromJSON(savedData, () => {
          initCanvas.renderAll();
          updateLayers(initCanvas);
          saveHistoryState(initCanvas);
        });
      } else {
        saveHistoryState(initCanvas);
      }

      const onChange = () => {
        updateLayers(initCanvas);
        saveHistoryState(initCanvas);
        autoSave(initCanvas);
      };

      initCanvas.on('object:added', () => { if(!isHistoryUpdate.current) onChange() });
      initCanvas.on('object:removed', () => { if(!isHistoryUpdate.current) onChange() });
      initCanvas.on('object:modified', () => { if(!isHistoryUpdate.current) onChange() });
      initCanvas.on('path:created', () => { if(!isHistoryUpdate.current) onChange() });

      return () => {
        initCanvas.dispose();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLayers = (canvasInstance: fabric.Canvas = canvas!) => {
    if (!canvasInstance) return;
    const objs = canvasInstance.getObjects();
    setLayers([...objs].reverse());
  };

  const autoSave = (canvasInstance: fabric.Canvas) => {
    const data = JSON.stringify(canvasInstance.toJSON());
    localStorage.setItem('photoshop-clone-data', data);
  };

  const saveHistoryState = (canvasInstance: fabric.Canvas) => {
    if (isHistoryUpdate.current) return;
    const json = JSON.stringify(canvasInstance.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(json);
      setHistoryStep(newHistory.length - 1);
      return newHistory;
    });
  };

  const undo = () => {
    if (historyStep > 0 && canvas) {
      isHistoryUpdate.current = true;
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      canvas.loadFromJSON(history[newStep], () => {
        canvas.renderAll();
        updateLayers(canvas);
        isHistoryUpdate.current = false;
        autoSave(canvas);
      });
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1 && canvas) {
      isHistoryUpdate.current = true;
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      canvas.loadFromJSON(history[newStep], () => {
        canvas.renderAll();
        updateLayers(canvas);
        isHistoryUpdate.current = false;
        autoSave(canvas);
      });
    }
  };

  // Handle Tool Changes
  useEffect(() => {
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.forEachObject(o => o.set('selectable', true));

    if (activeTool === 'brush') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
      }
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = '#ffffff';
        canvas.freeDrawingBrush.width = strokeWidth * 2;
      }
    } else if (activeTool === 'rectangle' || activeTool === 'circle') {
      canvas.selection = false;
      canvas.forEachObject(o => o.set('selectable', false));
    }
  }, [activeTool, canvas, strokeColor, strokeWidth]);

  const addShape = (type: string) => {
    if (!canvas) return;
    
    let shape;
    const commonOpts = {
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    };

    if (type === 'rectangle') {
      shape = new fabric.Rect({ ...commonOpts, width: 100, height: 100 });
    } else if (type === 'circle') {
      shape = new fabric.Circle({ ...commonOpts, radius: 50 });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      setActiveTool('select');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setToken(data.token);
        localStorage.setItem('user_token', data.token);
        setShowLogin(false);
        showToast(`Welcome, ${username}!`);
      } else {
        setLoginError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setLoginError('Could not connect to backend server');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('user_token');
    showToast('Logged out successfully');
  };

  const handleSave = async () => {
    if (!canvas) return;
    
    const data = JSON.stringify(canvas.toJSON());
    localStorage.setItem('photoshop-clone-data', data);
    
    if (token) {
      try {
        const res = await fetch('http://localhost:5000/api/projects', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ projectData: data })
        });
        const result = await res.json();
        if (result.status === 'success') {
          showToast('Project saved successfully to the cloud!');
        } else {
          showToast('Failed to save to cloud. Saved locally.');
        }
      } catch (e) {
        showToast('Backend offline. Saved locally!');
      }
    } else {
      showToast('Saved locally! Log in to save to the cloud.');
    }
  };

  const handleExport = () => {
    if (!canvas) return;
    canvas.renderAll();
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    const link = document.createElement('a');
    link.download = 'my-design.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Design exported!');
  };

  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      updateLayers(canvas);
      localStorage.removeItem('photoshop-clone-data');
      showToast('Canvas cleared!');
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {/* Login Modal */}
      {showLogin && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <form onSubmit={handleAuth} style={{
            background: 'var(--panel-bg)', padding: '30px', borderRadius: '12px',
            border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '15px',
            width: '320px', backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div onClick={() => setAuthMode('login')} style={{ flex: 1, textAlign: 'center', cursor: 'pointer', paddingBottom: '5px', borderBottom: authMode === 'login' ? '2px solid var(--primary-color)' : '2px solid transparent', color: authMode === 'login' ? '#fff' : 'var(--text-muted)' }}>Login</div>
              <div onClick={() => setAuthMode('register')} style={{ flex: 1, textAlign: 'center', cursor: 'pointer', paddingBottom: '5px', borderBottom: authMode === 'register' ? '2px solid var(--primary-color)' : '2px solid transparent', color: authMode === 'register' ? '#fff' : 'var(--text-muted)' }}>Register</div>
            </div>
            
            {loginError && <div style={{ color: 'var(--danger-color)', fontSize: '14px', textAlign: 'center' }}>{loginError}</div>}
            
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required
                   style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                   style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {authMode === 'login' ? 'Login' : 'Sign Up'}
              </button>
              <button type="button" onClick={() => setShowLogin(false)} style={{ flex: 1, padding: '10px', background: 'transparent', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Topbar */}
      <header className="topbar">
        <div className="logo-section">
          <div style={{ width: 24, height: 24, background: 'var(--primary-color)', borderRadius: 6 }}></div>
          PS | AI Clone
        </div>
        
        <div className="menu-items" style={{ flex: 1, justifyContent: 'center', gap: '30px' }}>
          <div style={{ display: 'flex', gap: '10px', marginRight: '20px' }}>
            <button className="tool-btn" onClick={undo} disabled={historyStep <= 0} title="Undo" style={{ opacity: historyStep <= 0 ? 0.3 : 1 }}>
              <Undo size={16} />
            </button>
            <button className="tool-btn" onClick={redo} disabled={historyStep >= history.length - 1} title="Redo" style={{ opacity: historyStep >= history.length - 1 ? 0.3 : 1 }}>
              <Redo size={16} />
            </button>
          </div>
          <div className="menu-item" onClick={clearCanvas}>New</div>
          <div className="menu-item" onClick={handleSave}>Save</div>
          <div className="menu-item" onClick={handleExport}>Export</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {token ? (
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <LogOut size={16} /> Logout
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <LogIn size={16} /> Login
            </button>
          )}
        </div>
      </header>

      {/* Workspace */}
      <div className="workspace">
        {/* Toolbar */}
        <aside className="toolbar glass-panel">
          <button className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} onClick={() => setActiveTool('select')} title="Select Tool">
            <MousePointer2 size={20} />
          </button>
          <button className={`tool-btn ${activeTool === 'brush' ? 'active' : ''}`} onClick={() => setActiveTool('brush')} title="Brush Tool">
            <Paintbrush size={20} />
          </button>
          <button className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="Eraser Tool">
            <Eraser size={20} />
          </button>
          <div style={{ height: 1, width: '60%', background: 'var(--border-color)', margin: '5px 0' }}></div>
          <button className="tool-btn" onClick={() => addShape('rectangle')} title="Add Rectangle">
            <Square size={20} />
          </button>
          <button className="tool-btn" onClick={() => addShape('circle')} title="Add Circle">
            <Circle size={20} />
          </button>
        </aside>

        {/* Canvas Area */}
        <main className="canvas-area">
          <div className="canvas-container-inner">
            <canvas ref={canvasRef} />
          </div>
        </main>

        {/* Properties & Layers */}
        <aside className="properties-panel glass-panel">
          <div className="panel-header">Properties</div>
          <div className="panel-content">
            <div className="control-group">
              <span className="control-label">Stroke Color</span>
              <input type="color" className="color-picker" value={strokeColor} onChange={(e) => {
                setStrokeColor(e.target.value);
                if (canvas && canvas.getActiveObject()) {
                  canvas.getActiveObject()?.set('stroke', e.target.value);
                  if(canvas.getActiveObject()?.type === 'path') {
                    canvas.getActiveObject()?.set('stroke', e.target.value);
                  }
                  canvas.renderAll();
                }
              }} />
            </div>
            <div className="control-group">
              <span className="control-label">Stroke Width: {strokeWidth}px</span>
              <input type="range" min="1" max="50" value={strokeWidth} onChange={(e) => {
                setStrokeWidth(Number(e.target.value));
                if (canvas && canvas.getActiveObject()) {
                  canvas.getActiveObject()?.set('strokeWidth', Number(e.target.value));
                  canvas.renderAll();
                }
              }} />
            </div>
          </div>

          <div className="panel-header" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Layers</span>
              <Layers size={14} />
            </div>
          </div>
          <div className="panel-content" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="layers-list">
              {layers.map((layer, index) => (
                <div key={index} className={`layer-item ${canvas?.getActiveObject() === layer ? 'active' : ''}`} onClick={() => {
                  canvas?.setActiveObject(layer);
                  canvas?.renderAll();
                }}>
                  <span>Layer {layers.length - index} ({layer.type})</span>
                  <div className="layer-actions">
                    <button className="layer-btn" title="Move Up" onClick={(e) => {
                      e.stopPropagation();
                      if (!canvas) return;
                      canvas.bringObjectForward(layer);
                      canvas.renderAll();
                      updateLayers(canvas);
                      saveHistoryState(canvas);
                      autoSave(canvas);
                    }}><ChevronUp size={14} /></button>
                    <button className="layer-btn" title="Move Down" onClick={(e) => {
                      e.stopPropagation();
                      if (!canvas) return;
                      canvas.sendObjectBackwards(layer);
                      canvas.renderAll();
                      updateLayers(canvas);
                      saveHistoryState(canvas);
                      autoSave(canvas);
                    }}><ChevronDown size={14} /></button>
                    <button className="layer-btn" title="Delete" onClick={(e) => {
                      e.stopPropagation();
                      canvas?.remove(layer);
                    }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {layers.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  No layers yet
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
