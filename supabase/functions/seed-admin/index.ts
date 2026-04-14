import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === 'admin@codevault.com');
    
    if (adminExists) {
      return new Response(JSON.stringify({ message: 'Admin already exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin user
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@codevault.com',
      password: 'Admin@123',
      email_confirm: true,
    });

    if (error) throw error;

    // Assign admin role
    await supabaseAdmin.from('user_roles').insert({
      user_id: user.user.id,
      role: 'admin',
    });

    // Seed sample data
    const { data: topic } = await supabaseAdmin.from('topics').insert({
      title: 'Data Structures',
      description: 'Fundamental data structures in C programming',
      sort_order: 1,
    }).select().single();

    if (topic) {
      const { data: subtopic } = await supabaseAdmin.from('subtopics').insert({
        topic_id: topic.id,
        title: 'Linked List',
        description: 'Singly linked list operations',
        sort_order: 1,
      }).select().single();

      if (subtopic) {
        await supabaseAdmin.from('programs').insert([
          {
            subtopic_id: subtopic.id,
            title: 'Create and Print Linked List',
            description: 'Creating a linked list with user input and printing it',
            language: 'c',
            code: `#include <stdio.h>\n#include <stdlib.h>\n\nstruct node{\n    int data;\n    struct node *next;\n};\n\nint main() {\n    struct node *head=NULL, *temp=NULL, *newnode;\n    int n=3;\n    int value;\n\n    // Creating the LinkedList\n    for(int i=0;i<n;i++){\n        printf("Enter the data part of the node %d: ", i+1);\n        scanf("%d", &value);\n        newnode = (struct node*)malloc(sizeof(struct node));\n        newnode->data = value;\n        newnode->next = NULL;\n\n        if(head==NULL){\n            head = newnode;\n            temp = newnode;\n        }\n        else{\n            temp->next = newnode;\n            temp = newnode;\n        }\n    }\n\n    // Printing the LinkedList\n    temp = head;\n    while (temp != NULL) {\n        printf("%d -> ", temp->data);\n        temp = temp->next;\n    }\n    printf("NULL\\n");\n\n    return 0;\n}`,
            sort_order: 1,
          },
          {
            subtopic_id: subtopic.id,
            title: 'Insertion at the Beginning',
            description: 'Insert a new node at the beginning of a linked list',
            language: 'c',
            code: `#include <stdio.h>\n#include <stdlib.h>\n\nstruct node{\n    int data;\n    struct node *next;\n};\n\nint main() {\n    struct node *head=NULL, *temp=NULL, *newnode;\n    int n=3, value;\n\n    for(int i=0;i<n;i++){\n        printf("Enter the data part of the node %d: ", i+1);\n        scanf("%d", &value);\n        newnode = (struct node*)malloc(sizeof(struct node));\n        newnode->data = value;\n        newnode->next = NULL;\n        if(head==NULL){ head = newnode; temp = newnode; }\n        else{ temp->next = newnode; temp = newnode; }\n    }\n\n    // Insertion at the beginning\n    int newvalue;\n    printf("\\nEnter the value to be inserted at the beginning: ");\n    scanf("%d", &newvalue);\n\n    newnode = (struct node*)malloc(sizeof(struct node));\n    newnode->data = newvalue;\n    newnode->next = head;\n    head = newnode;\n\n    printf("\\nLinkedList after insertion: \\n");\n    temp = head;\n    while (temp != NULL) {\n        printf("%d -> ", temp->data);\n        temp = temp->next;\n    }\n    printf("NULL\\n");\n    return 0;\n}`,
            sort_order: 2,
          },
          {
            subtopic_id: subtopic.id,
            title: 'Insertion at the End',
            description: 'Insert a new node at the end of a linked list',
            language: 'c',
            code: `#include <stdio.h>\n#include <stdlib.h>\n\nstruct node{\n    int data;\n    struct node *next;\n};\n\nint main() {\n    struct node *head=NULL, *temp=NULL, *newnode;\n    int n=3, value;\n\n    for(int i=0;i<n;i++){\n        printf("Enter the data part of the node %d: ", i+1);\n        scanf("%d", &value);\n        newnode = (struct node*)malloc(sizeof(struct node));\n        newnode->data = value;\n        newnode->next = NULL;\n        if(head==NULL){ head = newnode; temp = newnode; }\n        else{ temp->next = newnode; temp = newnode; }\n    }\n\n    // Insertion at the End\n    int newvalue;\n    printf("\\nEnter the value to be inserted at the end: ");\n    scanf("%d", &newvalue);\n\n    newnode = (struct node*)malloc(sizeof(struct node));\n    newnode->data = newvalue;\n    newnode->next = NULL;\n    if(head==NULL){ head = newnode; }\n    else{\n        temp = head;\n        while(temp->next != NULL){ temp = temp->next; }\n        temp->next = newnode;\n    }\n\n    printf("\\nLinkedList after insertion: \\n");\n    temp = head;\n    while (temp != NULL) {\n        printf("%d -> ", temp->data);\n        temp = temp->next;\n    }\n    printf("NULL\\n");\n    return 0;\n}`,
            sort_order: 3,
          },
          {
            subtopic_id: subtopic.id,
            title: 'Insertion at Middle',
            description: 'Insert a new node at a specific position in a linked list',
            language: 'c',
            code: `#include <stdio.h>\n#include <stdlib.h>\n\nstruct node{\n    int data;\n    struct node *next;\n};\n\nint main() {\n    struct node *head=NULL, *temp=NULL, *newnode;\n    int n=3, value;\n\n    for(int i=0;i<n;i++){\n        printf("Enter the data part of the node %d: ", i+1);\n        scanf("%d", &value);\n        newnode = (struct node*)malloc(sizeof(struct node));\n        newnode->data = value;\n        newnode->next = NULL;\n        if(head==NULL){ head = newnode; temp = newnode; }\n        else{ temp->next = newnode; temp = newnode; }\n    }\n\n    // Insertion at Middle\n    int newvalue, pos;\n    printf("Enter position to insert: ");\n    scanf("%d", &pos);\n    printf("\\nEnter the value to be inserted: ");\n    scanf("%d", &newvalue);\n\n    newnode = (struct node*)malloc(sizeof(struct node));\n    newnode->data = newvalue;\n    newnode->next = NULL;\n\n    if(pos == 1){\n        newnode->next = head;\n        head = newnode;\n    } else {\n        temp = head;\n        for(int i=1;i<pos-1;i++){\n            if(temp==NULL){\n                printf("Invalid Position\\n");\n                return 0;\n            }\n            temp = temp->next;\n        }\n        newnode->next = temp->next;\n        temp->next = newnode;\n    }\n\n    printf("\\nLinkedList after insertion: \\n");\n    temp = head;\n    while (temp != NULL) {\n        printf("%d -> ", temp->data);\n        temp = temp->next;\n    }\n    printf("NULL\\n");\n    return 0;\n}`,
            sort_order: 4,
          },
        ]);
      }
    }

    return new Response(JSON.stringify({ message: 'Admin created and data seeded!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
