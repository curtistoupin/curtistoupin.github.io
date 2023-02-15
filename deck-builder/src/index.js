//import React, { useState } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import decklist from "./decklist";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { boxesIntersect, useSelectionContainer } from "@air/react-drag-to-select";
import "./styles.css";

// fake data generator
const getItems = (count, offset = 0) =>
  Array.from({ length: count }, (v, k) => k).map(k => ({
    id: `item-${k + offset}-${new Date().getTime()}`,
    content: `item ${k + offset}`
  }));

const reorder = (list, startIndex, endIndex, state) => {
  
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const MouseSelection = React.memo(({ onSelectionChange }) => {
  const { DragSelection } = useSelectionContainer({
    eventsElement: document.getElementById("root"),
    onSelectionChange,
    onSelectionStart: () => {
      console.log("OnSelectionStart");
    },
    onSelectionEnd: () => console.log("OnSelectionEnd")
  });

  return <DragSelection />;
});
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
  return return_cols;
}

function Card(item, index, selected_indexes) {
  console.log('card');
  console.log(selected_indexes);
  console.log(item.key);
  console.log(selected_indexes.includes(item.key));
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
  const [selectionBox, setSelectionBox] = useState();
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const selectableItems = useRef([]);

  useEffect(() => {
    const elementsContainers = document.getElementsByClassName("elements-container");
    if (elementsContainers) {
      Array.from(elementsContainers)
        .map((e)=>(Array.from(e.childNodes)
        .map((e)=>(Array.from(e.childNodes)))))
        .flat(2)
        .forEach((item) => {
          const rectangle = item.getBoundingClientRect();
          selectableItems.current.push({
            card: item,
            bound: rectangle
        });
      });
    }
  }, []);

  const boxIntersects = ((box, item, ) => {
    const box_l = box.left;
    const box_r = box.left + box.width;
    const box_t = box.top;
    const box_b = box.top + box.height;
    const item_l = item.left;
    const item_r = item.left + item.width;
    const item_t = item.top;
    const item_b = item.top + 20; //TODO fix this so bottom card gets selected from whole art, remove magic number
    return (
      box_r >= item_l && item_r >= box_l && box_b >= item_t && item_b >= box_t
    )
  })

  const handleSelectionChange = useCallback(
    (box) => {
      setSelectionBox(box);
      console.log(selectableItems);
      const indexesToSelect = [];
      selectableItems.current.forEach((item, index) => {
        if (boxIntersects(box, item.bound)) {
          indexesToSelect.push(item.card.dataset.key);
        }
      });

      setSelectedIndexes(indexesToSelect);
      console.log(indexesToSelect);
    },
    [selectableItems]
  );

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
  }
  return (
    <div className='container'>
    <MouseSelection onSelectionChange={handleSelectionChange} />
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
            DeckColumn(el, ind, selectedIndexes)
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
