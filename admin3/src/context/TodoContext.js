import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const TodoContext = createContext();

const LOCAL_STORAGE_KEY = 'adminTodoList';

export const TodoProvider = ({ children }) => {
    const [todos, setTodos] = useState(() => {
        // Load initial todos from localStorage
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Failed to load todos from localStorage", error);
            return [];
        }
    });

    // Save todos to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todos));
        } catch (error) {
            console.error("Failed to save todos to localStorage", error);
        }
    }, [todos]);

    // Function to add a new todo item
    const addTodo = useCallback((text) => {
        if (!text || text.trim() === '') return; // Don't add empty todos
        const newTodo = { 
            id: Date.now(), 
            text: text.trim(), 
            completed: false, 
            createdAt: new Date().toISOString()
        };
        setTodos(prevTodos => [newTodo, ...prevTodos]);
    }, []);

    // Function to toggle the completion status of a todo
    const toggleTodo = useCallback((id) => {
        setTodos(prevTodos =>
            prevTodos.map(todo =>
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            )
        );
    }, []);

    // Function to delete a todo item
    const deleteTodo = useCallback((id) => {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
    }, []);

    // Function to clear all completed todos
    const clearCompleted = useCallback(() => {
        setTodos(prevTodos => prevTodos.filter(todo => !todo.completed));
    }, []);

    return (
        <TodoContext.Provider value={{ todos, addTodo, toggleTodo, deleteTodo, clearCompleted }}>
            {children}
        </TodoContext.Provider>
    );
};

export const useTodos = () => useContext(TodoContext); 