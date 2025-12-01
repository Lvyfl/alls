import { Student, Barangay, Module, Progress, Event, Activity, PredefinedActivity } from "@/types";

type ModulePayload = {
  title: string;
  levels: string[];
  predefinedActivities: PredefinedActivity[];
};

// Load students data
export const fetchStudents = async (): Promise<Student[]> => {
  try {
    let students: Student[] = [];

    // Fetch students from API with caching for better performance
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/students`, {
      method: "GET",
      cache: "default", // Allow browser caching
      next: { revalidate: 30 } // Revalidate every 30 seconds
    });

    // Check if the response is successful
    if (res.ok) {
      const response = await res.json();
      students = response as Student[];
    }

    console.log(`📊 Loaded ${students?.length} students from storage`);
    return students;
  } catch (error) {
    console.error("Error fetching students:", error);
    throw new Error("Failed to fetch students data");
  }
};

// Load barangays data with persistence
export const fetchBarangays = async (): Promise<Barangay[]> => {
  try {
    let barangays: Barangay[] = [];

    // Fetch barangays from API with caching
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/barangays`, {
      method: "GET",
      cache: "default",
      next: { revalidate: 300 } // Revalidate every 5 minutes (barangays don't change often)
    });

    // Check if the response is successful
    if (res.ok) {
      const response = await res.json();
      barangays = response as Barangay[];
    }

    console.log(`📊 Loaded ${barangays.length} barangays from storage`);
    return barangays;
  } catch (error) {
    console.error("Error fetching barangays:", error);
    throw new Error("Failed to fetch barangays data");
  }
};

// Load modules data
export const fetchModules = async (barangayId?: string): Promise<Module[]> => {
  try {
    let modules: Module[] = [];

    // Build URL with barangayId filter if provided
    const url = barangayId 
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/modules?barangayId=${encodeURIComponent(barangayId)}`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/api/modules`;

    // Fetch modules from API
    const res = await fetch(url, {
      method: "GET",
      cache: "default",
      next: { revalidate: 30 }
    });

    // check if the response is successful
    if (res.ok) {
      const response = await res.json();
      modules = response as Module[];
    }

    console.log(`📊 Loaded ${modules.length} modules${barangayId ? ` for barangay ${barangayId}` : ''} from storage`);

    return modules;
  } catch (error) {
    console.error("Error fetching modules:", error);
    throw new Error("Failed to fetch modules data");
  }
};

export const createModule = async (moduleData: ModulePayload & { barangayId?: string }): Promise<Module> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/modules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(moduleData),
      credentials: 'include', // Include cookies for barangay validation
    });

    if (!res.ok) {
      let message = "Failed to create module";
      try {
        const err = await res.json();
        if (err?.error) message = err.error;
      } catch {}
      throw new Error(message);
    }

    const response = await res.json();
    const payload = response?.data || moduleData;

    return {
      _id: payload._id || payload.id,
      title: payload.title ?? moduleData.title,
      levels: payload.levels ?? moduleData.levels,
      predefinedActivities: payload.predefinedActivities ?? moduleData.predefinedActivities,
      barangayId: payload.barangayId ?? moduleData.barangayId,
    };
  } catch (error) {
    console.error("Error creating module:", error);
    throw error instanceof Error ? error : new Error("Failed to create module");
  }
};

export const updateModule = async (_id: string, moduleData: ModulePayload & { barangayId?: string }): Promise<Module> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/modules`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _id, ...moduleData }),
      credentials: 'include', // Include cookies for barangay validation
    });

    if (!res.ok) {
      let message = "Failed to update module";
      try {
        const err = await res.json();
        if (err?.error) message = err.error;
      } catch {}
      throw new Error(message);
    }

    const response = await res.json();
    const payload = response?.data || { _id, ...moduleData };

    return {
      _id: payload._id || _id,
      title: payload.title ?? moduleData.title,
      levels: payload.levels ?? moduleData.levels,
      predefinedActivities: payload.predefinedActivities ?? moduleData.predefinedActivities,
      barangayId: payload.barangayId ?? moduleData.barangayId,
    };
  } catch (error) {
    console.error("Error updating module:", error);
    throw error instanceof Error ? error : new Error("Failed to update module");
  }
};

export const deleteModule = async (_id: string): Promise<void> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/modules`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _id }),
      credentials: 'include', // Include cookies for barangay validation
    });

    if (!res.ok) {
      let message = "Failed to delete module";
      try {
        const err = await res.json();
        if (err?.error) message = err.error;
      } catch {}
      throw new Error(message);
    }
  } catch (error) {
    console.error("Error deleting module:", error);
    throw error instanceof Error ? error : new Error("Failed to delete module");
  }
};

// Load progress data with persistence
export const fetchProgress = async (studentId: string): Promise<Progress[]> => {
  try {
    let progress: Progress[] = [];

    // Fetch progress from API
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/progress?studentId=${studentId}`, {
      method: "GET",
    });

    // check if the response is successful
    if (res.ok) {
      const response = await res.json();
      progress = response as Progress[];
    }

    console.log(`📊 Loaded ${progress.length} progress records from storage`);
    return progress;
  } catch (error) {
    console.error("Error fetching progress:", error);
    throw new Error("Failed to fetch progress data");
  }
};

// Create a new student
export const createStudent = async (
  student: Omit<Student, "_id">
): Promise<Student> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/students`, {
      method: "POST",
      body: JSON.stringify(student),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Check if the response is not successful
    if (!res.ok) {
      let message = "Failed to create student";
      try {
        const err = await res.json();
        if (err?.error) message = err.error;
      } catch {}
      throw new Error(message);
    }

    const response = await res.json();
    const newStudent: Student = {
      ...student,
      _id: response.data.insertedId.toString(),
    };

    console.log(
      `✅ Created new student: ${newStudent.name} (${newStudent._id})`
    );
    return newStudent;
  } catch (error) {
    console.error("Error creating student:", error);
    throw error instanceof Error ? error : new Error("Failed to create student");
  }
};

// Update an existing student with persistence
export const updateStudent = async (student: Student): Promise<Student> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/students`, {
      method: "PATCH",
      body: JSON.stringify(student),
      headers: {
        "Content-Type": "application/json",
      },
    });
    // Check if the response is not successful
    if (!res.ok) {
      let message = "Failed to update student";
      try {
        const err = await res.json();
        if (err?.error) message = err.error;
      } catch {}
      throw new Error(message);
    }

    console.log(`✅ Updated student: ${student.name} (${student._id})`);
    return student;
  } catch (error) {
    console.error("Error updating student:", error);
    throw error instanceof Error ? error : new Error("Failed to update student");
  }
};

// Delete a student with persistence
export const deleteStudent = async (_id: string): Promise<void> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/students`, {
      method: "DELETE",
      body: JSON.stringify({ _id }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to delete student");
    }

    console.log(`✅ Deleted and removed student from storage: ${_id}`);
  } catch (error) {
    console.error("Error deleting student:", error);
    throw new Error("Failed to delete student");
  }
};

// Create a new progress record with persistence
export const createProgress = async (
  progress: Omit<Progress, "id">
): Promise<Progress> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/progress`, {
      method: "POST",
      body: JSON.stringify(progress),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Check if the response is not successful
    if (!res.ok) {
      throw new Error("Failed to create student");
    }

    const response = await res.json();
    const newProgress: Progress = {
      ...progress,
      _id: response.data.insertedId.toString(),
    };

    console.log(
      `✅ Created and persisted new progress record: ${newProgress._id}`
    );
    return newProgress;
  } catch (error) {
    console.error("Error creating progress:", error);
    throw new Error("Failed to create progress record");
  }
};

// Update an existing progress record with persistence
export const updateProgress = async (
  studentId: string,
  moduleId: string,
  activityIndex: number,
  activity: Activity
): Promise<void> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/progress`, {
      method: "PATCH",
      body: JSON.stringify({
        studentId,
        moduleId,
        activityIndex,
        activity,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to update progress");
    }

    console.log(
      `✅ Updated activity ${activityIndex} for student ${studentId} in module ${moduleId}`
    );
  } catch (error) {
    console.error("Error updating progress:", error);
    throw new Error("Failed to update progress record");
  }
};

// Delete a progress record with persistence
export const deleteProgress = async (
  studentId: string,
  moduleId: string,
  activityIndex: number
): Promise<void> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/progress`, {
      method: "DELETE",
      body: JSON.stringify({ studentId, moduleId, activityIndex }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to delete student");
    }

    console.log(
      `✅ Deleted and removed progress record: ${moduleId}-${activityIndex}`
    );
  } catch (error) {
    console.error("Error deleting progress:", error);
    throw new Error("Failed to delete progress record");
  }
};

// Load events data
export const fetchEvents = async (): Promise<Event[]> => {
  try {
    let events: Event[] = [];

    // Fetch events from API
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/events`, {
      method: "GET",
    });

    // check if the response is successful
    if (res.ok) {
      const response = await res.json();
      events = response as Event[];
    }

    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw new Error("Failed to fetch events data");
  }
};

// Create a new event
export const createEvent = async (event: Omit<Event, "id">): Promise<Event> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/events`, {
      method: "POST",
      body: JSON.stringify(event),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Check if the response is not successful
    if (!res.ok) {
      throw new Error("Failed to create event");
    }

    const response = await res.json();
    const newEvent: Event = {
      ...event,
      _id: response.data.insertedId.toString(),
    };

    return newEvent;
  } catch (error) {
    console.error("Error creating event:", error);
    throw new Error("Failed to create event");
  }
};

// Update an existing event
export const updateEvent = async (event: Event): Promise<Event> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/events`, {
      method: "PATCH",
      body: JSON.stringify(event),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to update event");
    }

    console.log(`✅ Updated event ${event._id}`);

    return event;
  } catch (error) {
    console.error("Error updating event:", error);
    throw new Error("Failed to update event");
  }
};

// Delete an event
export const deleteEvent = async (_id: string): Promise<void> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/events`, {
      method: "DELETE",
      body: JSON.stringify({ _id }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to delete event");
    }

    console.log(`✅ Deleted and removed event from storage: ${_id}`);
  } catch (error) {
    console.error("Error deleting event:", error);
    throw new Error("Failed to delete event");
  }
};
