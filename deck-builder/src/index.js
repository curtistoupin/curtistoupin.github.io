//import React, { useState } from "react";
import ReactDOM from "react-dom";
import decklist from "./decklist";
import React, { useEffect, useRef, useState } from "react";
import "./styles.css";
import multiDragImage from './multidrag.png'
import blankDragImage from './blank.png'

const [dragSelect, dragDrop] = [0,1]

const getItemStyle = () => ({
  // some basic styles to make the items look a bit nicer
  userSelect: "none",
  userDrag: "none",
  pointerEvents:"none",
  padding: 0,
  margin: `0 0 2px 0px`,
  draggable: "false",
  position: 'relative',
  zIndex: -1
});

const getListStyle = isDraggingOver => ({
  background: isDraggingOver ? "lightblue" : "lightgrey",
  padding: 2,
  width: 133,
  height: 1000,
  draggable: 'false',
  pointerEvents:"none",
  userSelect: "none",
  userDrag: "none",
  position: "relative",
  zIndex: -2
});

function loadDeckList(list) {
  var expandedList = list.map((card)=>[...Array(card.qty).keys()].map((e)=>structuredClone(card))).flat()
  for(let i=0;i<expandedList.length;i++) {
    expandedList[i].key=i
  }
  const unique_mv = expandedList.map((e)=>(e.mv)).filter((value, index, array) => (array.indexOf(value) === index)).sort();
  const return_cols = unique_mv.map((mv)=>expandedList.filter((card)=>card.mv==mv));
  return return_cols;
}

function App() {
  const [state, setState] = useState(loadDeckList(decklist));
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const selectableItems = useRef([]);  
  const [mouseStart, setMouseStart] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [dragState, setDragState] = useState(dragDrop);
  const [mouseMoving, setMouseMoving] = useState(false);

  useEffect(() => {
    updateSelectableItems();
  })

  const selectBoxStyle =  () => {
    const mouseDefined = (mousePos != null) && (mouseStart != null);
    const box_l = mouseDefined ? Math.min(mouseStart.x, mousePos.x) : 0;
    const box_t = mouseDefined ? Math.min(mouseStart.y, mousePos.y) : 0;
    const box_w = mouseDefined ? Math.abs(mouseStart.x - mousePos.x) : 0;
    const box_h = mouseDefined ? Math.abs(mouseStart.y - mousePos.y) : 0;
    return ({
      visibility : (dragState == dragDrop ? 'hidden' : 'visible'),
      position: 'absolute',
      left: box_l,
      top: box_t,
      width: box_w,
      height: box_h,
      backgroundColor: '#83cfed',
      opacity: 0.45
    })
  }
  
  const ghostImageDivStyle = () => {
    return ( {
      position: 'absolute',
      visbility: ((selectedIndexes.length > 0) && (mouseMoving)) ? 'visible' : 'hidden',
      left: (mousePos == null) ? 0 : mousePos.x,
      top: (mousePos == null) ? 0 : mousePos.y+16,
      opacity: 0.75,
      pointerEvents: 'none'
    })
  }

  const boxIntersects = ((box, item) => {
    const lastInCol = state.map((col) => {
      if (col.length == 0) {
        return null;
      } else {
        return col[col.length-1].key==item.card.dataset.key;
      }
    }).includes(true);
    const box_l = box.left;
    const box_r = box.left + box.width;
    const box_t = box.top;
    const box_b = box.top + box.height;
    const item_l = item.bound.left;
    const item_r = item.bound.left + item.bound.width;
    const item_t = item.bound.top;
    const item_b = item.bound.top + (lastInCol ? item.bound.height : 20); //TODO remove magic number
    return (
      box_r >= item_l && item_r >= box_l && box_b >= item_t && item_b >= box_t
    )
  })

  const columnUnderCursor = () => {
    const elementsContainers = document.getElementsByClassName("elements-container");
    for (let col = 0; col < elementsContainers.length; col++) {
      const rectangle = elementsContainers[col].getBoundingClientRect();
      if(rectangle.left <= mousePos.x &&
        rectangle.right >= mousePos.x &&
        rectangle.top <= mousePos.y &&
        rectangle.bottom >= mousePos.y
      ) {
        return col;
      }
    }
    return null;
  }

  const updateSelectableItems = () => {
    const elementsContainers = document.getElementsByClassName("elements-container");
    const updatedItems = []
    if (elementsContainers) {
      Array.from(elementsContainers)
        .map((e)=>(Array.from(e.childNodes)
        .map((e)=>(Array.from(e.childNodes)))))
        .flat(2)
        .forEach((item) => {
          const rectangle = item.getBoundingClientRect();
          updatedItems.push({
            card: item,
            bound: rectangle
          
        });
      });
      selectableItems.current = updatedItems;
    }
  }

  const getGhostImageLink = () => {
    if(selectedIndexes.length > 1) {
      return multiDragImage;
    } else if (selectedIndexes.length > 0) {
      return getSelectableByKey(selectedIndexes[0]).card.attributes.src.textContent;
    } else {
      return blankDragImage;
    }
  }
  
  const getGhostImagePos = () => {
    if(mousePos == null || !mouseMoving) {
      return [0,0]
    } else {
      return [mousePos.x, mousePos.y+16]
    }
  }

  const updateSelectedItems = (box) => {
    const indexesToSelect = [];
    selectableItems.current.forEach((item) => {
      if(boxIntersects(box, item)) {
        indexesToSelect.push(item.card.dataset.key);
      }
    });
    setSelectedIndexes(indexesToSelect);
  }

  const handleMouseMove = (event) => {
    setMousePos({ x: event.clientX, y: event.clientY });
    if(dragState == dragSelect) {
      const box_l = Math.min(mousePos.x, mouseStart.x);
      const box_r = Math.max(mousePos.x, mouseStart.x);
      const box_w = box_r - box_l;
      const box_t = Math.min(mousePos.y, mouseStart.y);
      const box_b = Math.max(mousePos.y, mouseStart.y);
      const box_h = box_b - box_t;
      updateSelectedItems({left: box_l, top: box_t, width: box_w, height: box_h});
    }
    if(dragState == dragDrop) {
      const dx = mouseStart.x - mousePos.x;
      const dy = mouseStart.y - mousePos.y;
      const distance = Math.pow((Math.pow(dx, 2) + Math.pow(dy, 2)), 0.5)
      if(distance > 5) {
        setMouseMoving(true);
      }
    }
  }

  const cursorOverCard = (x,y) => {
    const box = {
      left: x,
      top: y,
      width: 0,
      height: 0
    }
    return selectableItems.current.map((item) => (boxIntersects(box, item))).includes(true);
  }

  const cursorOverSelectedCard = (x,y) => {
    const box = {
      left: x,
      top: y,
      width: 0,
      height: 0
    }
    return (
      selectableItems.current.filter(
        (item)=>(
          selectedIndexes.includes(
            item.card.dataset.key
          )
        )
      ).map(
        (item) => (
          boxIntersects(box, item)
        )
      ).includes(true)
    );
  }

  const onMouseDown = (event) => {
    setMouseStart({ x: event.clientX, y: event.clientY });
    setMousePos({ x : event.clientX, y: event.clientY });
    if(!cursorOverSelectedCard(event.clientX, event.clientY)) {
      updateSelectedItems({left: event.clientX, top: event.clientY, width: 0, height: 0});
    }
    const newDragState = cursorOverCard(event.clientX, event.clientY) ? dragDrop : dragSelect;

    setDragState(newDragState);
  }
  
  const onMouseUp = (event) => {
    if(dragState == dragDrop && mouseMoving) {
      onDragDropEnd(event.clientX, event.clientY);
    }
    setMouseMoving(false);
    setDragState(dragDrop);
    setMouseStart(null);
    setMousePos(null);
  }

  useEffect(() => {
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  })
  
  useEffect(() => {
    if (mouseStart != null) window.addEventListener('mousemove', handleMouseMove);
    return () => { window.removeEventListener('mousemove', handleMouseMove); }
  })

  const getSelectableByKey = (keyProvided) => {
    const [returnItem] = selectableItems.current.filter(
      (item) => (item.card.dataset.key == keyProvided)
    )
    return returnItem;
  }

  const isDraggingOverCard = (providedKey) => {
    if(dragState != dragDrop || 
      mousePos == null || 
      !mouseMoving || !
      cursorOverCard(mousePos.x, mousePos.y) ||
      selectedIndexes.includes(providedKey.toString())) {
      return(false);
    }
    const [x, y] = [mousePos.x,  mousePos.y]
    for(let col = 0; col < state.length; col++) {
      const unselected = state[col].filter((item) => (!selectedIndexes.includes(item.key.toString())));
      for(let ind = 0; ind < unselected.length; ind++) {
        if(unselected[ind].key != providedKey.toString()) {
          continue
        }
        const item = getSelectableByKey(unselected[ind].key);
        const nextItem = ((ind+1) < unselected.length) ? getSelectableByKey(unselected[ind+1].key) : null;
        const box_t = item.bound.top;
        const box_l = item.bound.left;
        const box_r = item.bound.left + item.bound.width;
        const box_b = (nextItem == null) ? (item.bound.top + item.bound.height) : (nextItem.bound.top);
        if( box_l <= x && x <= box_r && box_t <= y && y <= box_b) {
          return(true);
        }
      }
    }
    return(false);
  }

  function onDragDropEnd() {
    // dropped outside the list
    const dropCol = columnUnderCursor();
    if (dropCol == null) {
      return;
    }

    var newState = Array.from(state.map((column) => (Array.from(column))))
    const selection = newState.flat(2).filter((item) => (selectedIndexes.includes(item.key.toString())))
    selection.sort((a, b) => {
      if(a.mv > b.mv) {
        return 1;
      } else if (a.mv < b.mv) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      } else if (a.name < b.name) {
        return -1;
      }
      return 0;
    })
    newState = [...newState.map((column) => (column.filter((item) => (!selectedIndexes.includes(item.key.toString())))))]
    for (let i = 0; i < newState[dropCol].length; i++) {
      const item = getSelectableByKey(newState[dropCol][i].key);
      if (mousePos.y < item.bound.top) {
        newState[dropCol].splice(i, 0, ...selection);
        setState(newState);
        return;
      }
    }
    newState[dropCol].splice(newState[dropCol].length+1, 0, ...selection);
    setState(newState);
    return;
  }

  return (
    <div 
      className='container' 
      draggable="false"
      style={{pointerEvents:"none"}}
    >
      <button
        type="button"
        onClick={() => {
          setState([...state, []]);
        }}
      >
        Add new group
      </button>
      <button
        type="button"
        onClick={() => {
          setState([...state, []]);
        }}
      >
        Add new item
      </button>
      <div draggable = 'false' style={{ display: "flex"}}>
        {state.map((el, ind) => (
          <div
          className='elements-container'
          key = {`deck-col-list-${ind}`}
          style={getListStyle(false)}
          draggable = "false"
        >
          {el.map((item, index) => (
            <div 
              style={{height: '20px', width:130}}
              key = {`card-div-${index}`}
              draggable = 'false'
              className = {`card-div ${
                isDraggingOverCard(item.key.toString()) ? "draggingOver" : ""
              } ${
                selectedIndexes.includes(item.key.toString()) && mouseMoving ? "beingMoved" : ""
              }` }
            >
              <img 
                src={`https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${item.id}&type=card`}
                alt={item.name}
                width="130" 
                height="181"
                data-key={item.key}
                draggable='false'
                className={`element ${
                  selectedIndexes.includes(item.key.toString()) ? "selected" : ""
                } ${
                  selectedIndexes.includes(item.key.toString()) && mouseMoving ? "beingMoved" : ""
                }`}
                style={getItemStyle(false)}
              />
            </div>
          ))}
        </div>
        ))}
      </div>
      <div 
        className = 'selectBox'
        draggable = 'false'
        style = {selectBoxStyle()}
      >
      </div>
      <div 
          draggable = 'false'
          className={`dragPreview 
            ${((selectedIndexes.length > 0) && (mouseMoving)) ? "cardsBeingDragged" : ""}
          `}
          style={ghostImageDivStyle()}
      >
        <img
          src={getGhostImageLink()}
          alt='drag'
          draggable = 'false'
          width='100'
          className={`dragPreviewImg
            ${((selectedIndexes.length > 0) && (mouseMoving)) ? "cardsBeingDragged" : ""}
          `}
          style={{
            visibility: `${((selectedIndexes.length > 0) && (mouseMoving)) ? "visible" : "hidden"}`, 
            position: "relative"
          }}
        />
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
