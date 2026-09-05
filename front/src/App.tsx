import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { MousePointer2, Paintbrush, Eraser, Square, Circle, Layers, Download, Save, Trash2 } from 'lucide-react';
import './index.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#5c67ff');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [layers, setLayers] = useState<any[]>([]);

  // Initialize Canvas
  useEffect(() => {
    if (canvasRef.current) {
      const initCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        isDrawingMode: false,
      });

      setCanvas(initCanvas);

      initCanvas.on('object:added', updateLayers);
      initCanvas.on('object:removed', updateLayers);
      initCanvas.on('object:modified', updateLayers);
      
      // Load from local storage if exists
      const savedData = localStorage.getItem('photoshop-clone-data');
      if (savedData) {
        initCanvas.loadFromJSON(savedData, () => {
          initCanvas.renderAll();
          updateLayers(initCanvas);
        });
      }

      return () => {
        initCanvas.dispose();
      };
    }
  }, []);

  const updateLayers = (canvasInstance: fabric.Canvas = canvas!) => {
    if (!canvasInstance) return;
    const objs = canvasInstance.getObjects();
    setLayers([...objs].reverse());
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
      // Simple eraser logic: use background color for brush
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = '#ffffff';
        canvas.freeDrawingBrush.width = strokeWidth * 2;
      }
    } else if (activeTool === 'rectangle' || activeTool === 'circle') {
      canvas.selection = false;
      canvas.forEachObject(o => o.set('selectable', false));
      // Object drawing handled by mousedown events if we implement drag-to-draw
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

  const handleSave = async () => {
    if (!canvas) return;
    
    // Save to LocalStorage
    const data = JSON.stringify(canvas.toJSON());
    localStorage.setItem('photoshop-clone-data', data);
    
    // Optional: Send to Backend
    try {
      await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData: data })
      });
      alert('Project saved successfully!');
    } catch (e) {
      console.log('Backend not running, saved locally.');
    }
  };

  const handleExport = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = 'my-design.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      localStorage.removeItem('photoshop-clone-data');
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <header className="topbar">
        <div className="logo-section">
          <div style={{ width: 24, height: 24, background: 'var(--primary-color)', borderRadius: 6 }}></div>
          PS | AI Clone
        </div>
        <div className="menu-items">
          <div className="menu-item" onClick={clearCanvas}>New</div>
          <div className="menu-item" onClick={handleSave}>Save</div>
          <div className="menu-item" onClick={handleExport}>Export</div>
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
                    <button className="layer-btn" onClick={(e) => {
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
