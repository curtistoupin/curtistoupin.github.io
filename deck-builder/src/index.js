//import React, { useState } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import decklist from "./decklist";
import React, { useEffect, useRef, useState } from "react";
import "./styles.css";

const [dragSelect, dragDrop] = [0,1]

const reorder = (list, startIndex, endIndex, state) => {
  
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

/**
 * Moves an item from one list to another list.
 */
const move = (source, destination, droppableSource, droppableDestination) => {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);

  destClone.splice(droppableDestination.index, 0, removed);

  const result = {};
  result[droppableSource.droppableId] = sourceClone;
  result[droppableDestination.droppableId] = destClone;

  return result;
};
const grid = 8;

const getItemStyle = (isDragging, draggableStyle) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: "none",
  userDrag: "none",
  padding: 0,
  margin: `0 0 2px 0px`,

  // change background colour if dragging
  background: isDragging ? "lightgreen" : "grey",

  // styles we need to apply on draggables
  ...draggableStyle
});
const getListStyle = isDraggingOver => ({
  background: isDraggingOver ? "lightblue" : "lightgrey",
  padding: 2,
  width: 133,
  height: 1000,
  userSelect: "none",
  userDrag: "none"
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

function Card(item, index, selected_indexes) {
  return(
  <Draggable
      key={item.key}
      draggableId={item.key.toString()}
      index={index}
    >
      {(provided, snapshot) => (
        <div 
          style={{height: '20px'}}
        >
        <img 
          src={`https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${item.id}&type=card`}
          alt={item.name}
          width="130" 
          height="181"
          data-key={item.key}
          className={`element ${
            selected_indexes.includes(item.key.toString()) ? "selected" : ""
          } `}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={getItemStyle(
            snapshot.isDragging,
            provided.draggableProps.style
          )}
        />
        </div>
      )}
    </Draggable>
  );
}

function DeckColumn(el, ind, selected_indexes) {
  return (
    <Droppable key={ind} droppableId={`${ind}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          className='elements-container'
          style={getListStyle(snapshot.isDraggingOver)}
          {...provided.droppableProps}
        >
          {el.map((item, index) => (
            Card(item, index, selected_indexes)
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function App() {
  const [state, setState] = useState(loadDeckList(decklist));
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const selectableItems = useRef([]);  
  const [mouseStart, setMouseStart] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [dragState, setDragState] = useState(dragDrop);

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

  const boxIntersects = ((box, item) => {
    const lastInCol = state.map((col) => (col[col.length-1].key==item.card.dataset.key)).includes(true);
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

  const updateSelectedItems = (box) => {
    const indexesToSelect = [];
    selectableItems.current.forEach((item, index) => {
      if(boxIntersects(box, item)) {
        indexesToSelect.push(item.card.dataset.key);
      }
    });
    setSelectedIndexes(indexesToSelect);
  }

  // const clearSelectedItems = () => {
  //   setSelectedIndexes([]);
  // }

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
  }

  const onMouseDown = (event) => {
    setMouseStart({ x: event.clientX, y: event.clientY });
    setMousePos({ x : event.clientX, y: event.clientY });
    updateSelectedItems({left: event.clientX, top: event.clientY, width: 0, height: 0});

    const box = {
      left: event.clientX,
      top: event.clientY,
      width: 0,
      height: 0
    }
    var intersects = false;
    selectableItems.current.forEach((item) => {
      if (boxIntersects(box, item)) {
        intersects = true;
      }
    })
    const newDragState = intersects ? dragDrop : dragSelect;
    setDragState(newDragState);
  }
  
  const onMouseUp = (event) => {
    if(dragState == dragDrop) {

    }
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
  },[])
  
  useEffect(() => {
    if (mouseStart != null) window.addEventListener('mousemove', handleMouseMove);
    return () => { window.removeEventListener('mousemove', handleMouseMove); }
  })

  function onDragEnd(result) {
    const { source, destination } = result;
    // dropped outside the list
    if (!destination) {
      return;
    }
    const sInd = +source.droppableId;
    const dInd = +destination.droppableId;

    if (sInd === dInd) {
      const items = reorder(state[sInd], source.index, destination.index, state);
      const newState = [...state];
      newState[sInd] = items;
      setState(newState);
    } else {
      const result = move(state[sInd], state[dInd], source, destination);
      const newState = [...state];
      newState[sInd] = result[sInd];
      newState[dInd] = result[dInd];

      setState(newState.filter(group => group.length));
    }
    updateSelectableItems();
  }
  return (
    <div 
      className='container' 
      draggable="false"
      style={{userDrag: "none"}}
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
      <div style={{ display: "flex" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {state.map((el, ind) => (
            DeckColumn(el, ind, selectedIndexes)
          ))}
        </DragDropContext>
      </div>
      <div 
        className = 'selectBox'
        style = {selectBoxStyle()}
      >
      
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
