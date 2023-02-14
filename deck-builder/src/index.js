//import React, { useState } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import decklist from "./decklist";
import { Box, boxesIntersect, useSelectionContainer } from '@air/react-drag-to-select';
import  { useEffect, useRef, useState } from 'react';

// fake data generator
const getItems = (count, offset = 0) =>
  Array.from({ length: count }, (v, k) => k).map(k => ({
    id: `item-${k + offset}-${new Date().getTime()}`,
    content: `item ${k + offset}`
  }));

const reorder = (list, startIndex, endIndex, state) => {
  console.log(state)
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
  height: 1000
});

function loadDeckList(list) {
  var expandedList = list.map((card)=>[...Array(card.qty).keys()].map((e)=>structuredClone(card))).flat()
  for(let i=0;i<expandedList.length;i++) {
    expandedList[i].key=i
  }
  const unique_mv = expandedList.map((e)=>(e.mv)).filter((value, index, array) => (array.indexOf(value) === index)).sort();
  const return_cols = unique_mv.map((mv)=>expandedList.filter((card)=>card.mv==mv));
  console.log(return_cols);
  return return_cols;
}

function Card(item, index) {
  const [selectionBox, setSelectionBox] = useState();
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const selectableItems = useRef([]);
  const elementsContainerRef = useRef(null);
  const { DragSelection } = useSelectionContainer({
    eventsElement: document.getElementById('root'),
    onSelectionChange: (box) => {
      /**
       * Here we make sure to adjust the box's left and top with the scroll position of the window 
       * @see https://github.com/AirLabsTeam/react-drag-to-select/#scrolling
       */
      const scrollAwareBox = {
        ...box,
        top: box.top + window.scrollY,
        left: box.left + window.scrollX
      }

      setSelectionBox(scrollAwareBox);
      const indexesToSelect = [];
      selectableItems.current.forEach((item, index) => {
        if (boxesIntersect(scrollAwareBox, item)) {
          indexesToSelect.push(index);
        }
      });

      setSelectedIndexes(indexesToSelect);
    },
    onSelectionStart: () => {
      console.log('OnSelectionStart');
    },
    onSelectionEnd: () => console.log('OnSelectionEnd'),
    selectionProps: {
      style: {
        border: '2px dashed purple',
        borderRadius: 4,
        backgroundColor: 'brown',
        opacity: 0.5,
      },
    },
    shouldStartSelecting: (target) => {
      // do something with target to determine if the user should start selecting

      return true;
    }
  });

  useEffect(() => {
  
    if (elementsContainerRef.current) {
      Array.from(elementsContainerRef.current.children).forEach((item) => {
        const { left, top, width, height } = item.getBoundingClientRect();
        selectableItems.current.push({
          left,
          top,
          width,
          height,
        });
      });
    }
  }, []);
  return(
  <Draggable
      key={item.key}
      draggableId={item.key.toString()}
      index={index}
    >
      {(provided, snapshot) => (
        <div style={{height: '20px'}}>
        <img 
          src={`https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${item.id}&type=card`}
          alt={item.name}
          width="130" 
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

function DeckColumn(el, ind) {
  return (
    <Droppable key={ind} droppableId={`${ind}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          style={getListStyle(snapshot.isDraggingOver)}
          {...provided.droppableProps}
        >
          {el.map((item, index) => (
            Card(item, index)
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function App() {
  
  console.log([[...loadDeckList(decklist)]]);
  const [state, setState] = useState(loadDeckList(decklist));

  function onDragEnd(result) {
    const { source, destination } = result;
    console.log('dragged');
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
  }
  return (
    <div>
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
          setState([...state, getItems(1)]);
        }}
      >
        Add new item
      </button>
      <div style={{ display: "flex" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {state.map((el, ind) => (
            DeckColumn(el, ind)
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
